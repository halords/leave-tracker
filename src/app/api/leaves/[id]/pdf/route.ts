import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const { id } = await params;

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leave = await prisma.leave.findUnique({
    where: { id },
    include: { profile: true },
  });

  if (!leave) {
    return NextResponse.json({ error: "Leave not found" }, { status: 404 });
  }

  try {
    const pdfPath = path.resolve(process.cwd(), "public", "templates", "leave template.pdf");
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const p = leave.profile;
    const fullName = p.lastName && p.firstName ? `${p.lastName}, ${p.firstName} ${p.middleName || ''}`.trim() : (p.email || "");

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const page = pages[0];

    const drawCenteredTextInField = (fieldName: string, text: string, font: any, size: number) => {
      if (!text) return;
      const field = form.getTextField(fieldName);
      const widgets = field.acroField.getWidgets();
      if (widgets.length > 0) {
        const rect = widgets[0].getRectangle();
        const textWidth = font.widthOfTextAtSize(text, size);
        const x = rect.x + (rect.width / 2) - (textWidth / 2);
        // Approximate Y centering
        const y = rect.y + (rect.height / 2) - (size / 2) + 2; 
        page.drawText(text, {
          x,
          y,
          size,
          font,
          color: rgb(0, 0, 0),
        });
        field.setText(""); // clear native text
      }
    };

    const formattedSalary = p.salary ? `Php ${Number(p.salary).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "";
    const formattedDate = new Date(leave.dateFiled).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    drawCenteredTextInField("POSITION", p.position || "", helvetica, 11);
    drawCenteredTextInField("5 SALARY", formattedSalary, helvetica, 11);
    drawCenteredTextInField("working days", leave.workingDays.toString(), helvetica, 11);
    drawCenteredTextInField("dates", leave.datesApplied, helvetica, 11);
    drawCenteredTextInField("filing", formattedDate, helvetica, 11);
    drawCenteredTextInField("name", fullName, helvetica, 11);
    drawCenteredTextInField("office", p.office || "", helvetica, 11);
    drawCenteredTextInField("recname", p.recName || "", helveticaBold, 11);
    drawCenteredTextInField("reqpos", p.recPos || "", helvetica, 11);

    // Custom drawing for aprsig to mix bold name and normal position
    const aprsigField = form.getTextField("aprsig");
    const aprsigWidgets = aprsigField.acroField.getWidgets();
    if (aprsigWidgets.length > 0) {
      const rect = aprsigWidgets[0].getRectangle();
      
      const sigName = p.signatoryName || "";
      const sigPos = p.signatoryPos || "";
      
      const nameWidth = helveticaBold.widthOfTextAtSize(sigName, 11);
      const posWidth = helvetica.widthOfTextAtSize(sigPos, 9);
      
      const nameX = rect.x + (rect.width / 2) - (nameWidth / 2);
      const posX = rect.x + (rect.width / 2) - (posWidth / 2);
      
      page.drawText(sigName, {
        x: nameX,
        y: rect.y + rect.height - 14,
        size: 11,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(sigPos, {
        x: posX,
        y: rect.y + rect.height - 28,
        size: 9,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      
      aprsigField.setText("");
    }

    // Checkboxes
    const typeMap: Record<string, string> = {
      "Vacation": "vl",
      "Mandatory/Forced": "fl",
      "Sick": "sl",
      "Maternity": "ml",
      "Paternity": "pl",
      "Special Privilege": "spl",
      "Solo Parent": "sprl",
      "Study": "stl",
      "VAWC": "vawc",
      "Rehabilitation": "rhl",
      "Special Leave Benefits for Women": "slbw",
      "Special Emergency (Calamity)": "clmtyl",
      "Adoption": "adpl",
    };

    const checkboxName = typeMap[leave.leaveType];
    
    // Check location/medical contexts
    let finalLeaveDetails = leave.leaveDetails;
    if (!finalLeaveDetails && ["Vacation", "Special Privilege", "Wellness", "Mandatory/Forced"].includes(leave.leaveType)) {
      finalLeaveDetails = "within";
    }
    
    if (finalLeaveDetails) {
      const checkboxToMap = finalLeaveDetails === "abroad" ? "outside" : finalLeaveDetails;
      try { form.getCheckBox(checkboxToMap).check(); } catch (e) { console.warn("Failed to check", checkboxToMap, e); }
    }

    if (checkboxName) {
      try { form.getCheckBox(checkboxName).check(); } catch (e) { console.warn("Failed to check", checkboxName, e); }
    } else if (leave.leaveType === "Wellness") {
      try { 
        form.getTextField("Others").setText("Wellness Leave");
      } catch (e) { console.warn("Failed to set Others", e); }
    }

    // Explicitly uncheck Vacation Leave field if it's not selected (source PDF has it permanently checked by default)
    if (checkboxName !== "vl") {
      try { 
        const vlBox = form.getCheckBox("vl");
        vlBox.uncheck();
      } catch (e) { console.warn("Failed to uncheck vl", e); }
    }

    // Monetization and Commutation - strict checks and REMOVE unwanted defaults
    if (leave.isMonetization === true) {
      try { form.getCheckBox("mone").check(); } catch (e) { console.warn(e); }
      try { form.getCheckBox("req").check(); } catch (e) { console.warn(e); }
      try { 
        const notreqBox = form.getCheckBox("notreq");
        notreqBox.uncheck();
      } catch (e) { console.warn(e); }
    } else {
      try { form.getCheckBox("notreq").check(); } catch (e) { console.warn(e); }
      try { 
        const reqBox = form.getCheckBox("req");
        reqBox.uncheck();
      } catch (e) { console.warn(e); }
      try { 
        const moneBox = form.getCheckBox("mone");
        moneBox.uncheck();
      } catch (e) { console.warn(e); }
    }

    // Automatically check for approval
    try { form.getCheckBox("appr").check(); } catch (e) { console.warn(e); }

    // Flatten the form
    form.flatten();
    
    // Append back page.pdf if it exists
    try {
      const backPagePath = path.resolve(process.cwd(), "public", "templates", "back page.pdf");
      if (fs.existsSync(backPagePath)) {
        const backPageBytes = fs.readFileSync(backPagePath);
        const backPageDoc = await PDFDocument.load(backPageBytes);
        const copiedPages = await pdfDoc.copyPages(backPageDoc, backPageDoc.getPageIndices());
        copiedPages.forEach((page) => pdfDoc.addPage(page));
      }
    } catch (e) {
      console.warn("Failed to append back page.pdf", e);
    }
    
    const finalPdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(finalPdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="leave_${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
