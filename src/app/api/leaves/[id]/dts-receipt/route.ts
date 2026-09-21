import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { generateDtsSubject } from "@/lib/dts-client";

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
  
  if (!leave.dtsTransactionNo || !leave.dtsQrCode) {
    return NextResponse.json({ error: "Leave has not been submitted to DTS yet" }, { status: 400 });
  }

  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size in points (8.5 x 11 inches)
    
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Load and embed the logo image
    const logoPath = path.join(process.cwd(), "public", "dts-logo.png");
    const logoBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    
    // Scale logo to fit reasonably (e.g. 40px height)
    const logoDims = logoImage.scaleToFit(200, 40);
    
    // Draw the receipt 3 times on the page (Office, Receiving, Receiving)
    // Based on the DTS offset logic (0, 255, 510)
    const offsets = [0, 255, 510];
    const titles = ["(Office Copy)", "(Receiving Copy)", "(Receiving Copy)"];
    
    const p = leave.profile;
    const fullName = p.lastName && p.firstName ? `${p.lastName}, ${p.firstName} ${p.middleName || ''}`.trim() : (p.email || "");
    const subject = generateDtsSubject(fullName, leave.leaveType, leave.datesApplied, leave.workingDays);
    
    const dateSubmitted = leave.dtsSubmittedAt ? new Date(leave.dtsSubmittedAt) : new Date();
    const dateStr = dateSubmitted.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = dateSubmitted.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Generate QR Code image buffer
    const qrCodeBuffer = await QRCode.toBuffer(leave.dtsQrCode!);
    const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer);
    
    // We invert Y coordinates because pdf-lib origin is bottom-left, while jsPDF is top-left
    const height = 792;
    
    offsets.forEach((offset, idx) => {
        // Draw Logo Image
        page.drawImage(logoImage, {
            x: 20,
            y: height - (75 + offset), // Lowered slightly
            width: logoDims.width,
            height: logoDims.height,
        });
        
        // Receipt Title
        page.drawText("RECEIPT", { x: 25, y: height - (30 + offset), size: 10, font: helvetica, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(titles[idx], { x: 72, y: height - (30 + offset), size: 10, font: helveticaBold, color: rgb(0, 0, 0) });
        
        // Draw grid lines
        const drawHLine = (y: number) => page.drawLine({ start: { x: 20, y: height - y }, end: { x: 592, y: height - y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
        const drawVLine = (x: number, y1: number, y2: number) => page.drawLine({ start: { x, y: height - y1 }, end: { x, y: height - y2 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
        
        const topY = 125 + offset;
        const bottomY = 245 + offset;
        
        [125, 155, 185, 215, 245].forEach(y => drawHLine(y + offset));
        
        drawVLine(20, topY, bottomY);
        drawVLine(592, topY, bottomY);
        drawVLine(130, topY, bottomY);
        drawVLine(249, 185 + offset, bottomY);
        drawVLine(360, 185 + offset, bottomY);
        drawVLine(478, 185 + offset, bottomY);
        drawVLine(520, 185 + offset, bottomY);
        
        drawVLine(360, 125 + offset, 155 + offset);
        drawVLine(478, 125 + offset, 155 + offset);
        
        // Grid Labels
        const drawLabel = (text: string, x: number, y: number) => {
            page.drawText(text, { x, y: height - (y + offset), size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
        };
        
        drawLabel("TRANSACTION NO.", 25, 144);
        drawLabel("TRANSACTION", 365, 144);
        drawLabel("SUBJECT", 25, 174);
        drawLabel("RECEIVING OFFICE", 25, 204);
        drawLabel("ORIGINATING OFFICE", 254, 204);
        drawLabel("DATE", 483, 204);
        drawLabel("COMMUNICATION", 25, 234);
        drawLabel("DOCUMENT TYPE", 254, 234);
        drawLabel("TIME", 483, 234);
        
        // Grid Values
        const drawValue = (text: string, x: number, y: number, maxW?: number) => {
            // Very simple truncation if needed
            let displayTxt = text;
            if (maxW && helvetica.widthOfTextAtSize(text, 9) > maxW) {
                displayTxt = text.substring(0, 50) + "...";
            }
            page.drawText(displayTxt || "", { x, y: height - (y + offset), size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
        };
        
        drawValue(leave.dtsTransactionNo!, 135, 144);
        drawValue("Simple", 483, 144);
        drawValue(subject, 135, 174, 420);
        
        drawValue("OPA", 135, 204); // Using OPA as requested
        drawValue("ASMU", 365, 204);
        drawValue(dateStr, 525, 204);
        
        drawValue("To Internal", 135, 234);
        drawValue("LEAVE", 365, 234);
        drawValue(timeStr, 525, 234);
        
        // QR Code Image and Text
        page.drawImage(qrCodeImage, {
            x: 485, // align to right side above text
            y: height - (115 + offset),
            width: 45,
            height: 45,
        });
        page.drawText(leave.dtsQrCode!, { x: 460, y: height - (121 + offset), size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
        
        // Divider
        if (offset < 510) {
            page.drawLine({ start: { x: 0, y: height - (255 + offset) }, end: { x: 612, y: height - (255 + offset) }, thickness: 1, color: rgb(0, 0, 0) });
        }
    });

    const finalPdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(finalPdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="dts_receipt_${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
