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
    // A4 size in points: 595.28 x 841.89 (210 x 297 mm)
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Load and embed the logo image
    const logoPath = path.join(process.cwd(), "public", "dts-logo.png");
    const logoBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    
    // Scale logo to match original size
    const logoDims = logoImage.scaleToFit(300, 75);
    
    // Draw the receipt 3 times on the page (Office, Receiving, Receiving)
    // Based on the DTS offset logic (0, 255, 510)
    const offsets = [0, 255, 510];
    const titles = ["(Office Copy)", "(Receiving Copy)", "(Receiving Copy)"];
    
    const p = leave.profile;
    const fullName = p.lastName && p.firstName ? `${p.lastName}, ${p.firstName} ${p.middleName || ''}`.trim() : (p.email || "");
    const subject = generateDtsSubject(fullName, leave.leaveType, leave.datesApplied, leave.workingDays);
    
    const dateSubmitted = leave.dtsSubmittedAt ? new Date(leave.dtsSubmittedAt) : new Date();
    const dateStr = dateSubmitted.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = dateSubmitted.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Generate QR Code image buffer with full DTS tracking link
    const qrUrl = `https://dts.launion.gov.ph/qr/${leave.dtsQrCode!}`;
    const qrCodeBuffer = await QRCode.toBuffer(qrUrl, { margin: 0, errorCorrectionLevel: 'M' });
    const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer);
    
    // We invert Y coordinates because pdf-lib origin is bottom-left, while jsPDF is top-left
    const height = pageHeight;
    
    offsets.forEach((offset, idx) => {
        // Receipt Title (Above Logo)
        page.drawText("RECEIPT", { x: 25, y: height - (30 + offset), size: 10, font: helvetica, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(titles[idx], { x: 72, y: height - (30 + offset), size: 10, font: helveticaBold, color: rgb(0, 0, 0) });

        // Draw Logo Image
        page.drawImage(logoImage, {
            x: 25,
            y: height - (115 + offset), // Bottom aligned just above the grid
            width: logoDims.width,
            height: logoDims.height,
        });
        
        // Draw grid lines (fits A4 width 595.28 pt with ~15pt margins)
        const leftX = 15;
        const rightX = 580;
        const drawHLine = (y: number) => page.drawLine({ start: { x: leftX, y: height - y }, end: { x: rightX, y: height - y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
        const drawVLine = (x: number, y1: number, y2: number) => page.drawLine({ start: { x, y: height - y1 }, end: { x, y: height - y2 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
        
        const topY = 125 + offset;
        const bottomY = 245 + offset;
        
        [125, 155, 185, 215, 245].forEach(y => drawHLine(y + offset));
        
        drawVLine(leftX, topY, bottomY);
        drawVLine(rightX, topY, bottomY);
        drawVLine(125, topY, bottomY);
        drawVLine(245, 185 + offset, bottomY);
        drawVLine(355, 185 + offset, bottomY);
        drawVLine(470, 185 + offset, bottomY);
        drawVLine(515, 185 + offset, bottomY);
        
        drawVLine(355, 125 + offset, 155 + offset);
        drawVLine(470, 125 + offset, 155 + offset);
        
        // Grid Labels
        const drawLabel = (text: string, x: number, y: number) => {
            page.drawText(text, { x, y: height - (y + offset), size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
        };
        
        drawLabel("TRANSACTION NO.", 20, 144);
        drawLabel("TRANSACTION", 360, 144);
        drawLabel("SUBJECT", 20, 174);
        drawLabel("RECEIVING OFFICE", 20, 204);
        drawLabel("ORIGINATING OFFICE", 250, 204);
        drawLabel("DATE", 475, 204);
        drawLabel("COMMUNICATION", 20, 234);
        drawLabel("DOCUMENT TYPE", 250, 234);
        drawLabel("TIME", 475, 234);
        
        // Grid Values
        const drawValue = (text: string, x: number, y: number, maxW?: number) => {
            // Very simple truncation if needed
            let displayTxt = text;
            if (maxW && helvetica.widthOfTextAtSize(text, 9) > maxW) {
                displayTxt = text.substring(0, 50) + "...";
            }
            page.drawText(displayTxt || "", { x, y: height - (y + offset), size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
        };
        
        drawValue(leave.dtsTransactionNo!, 130, 144);
        drawValue("Simple", 475, 144);
        drawValue(subject, 130, 174, 420);
        
        drawValue("OPA", 130, 204); // Using OPA as requested
        drawValue("ASMU", 360, 204);
        drawValue(dateStr, 520, 204);
        
        drawValue("To Internal", 130, 234);
        drawValue("LEAVE", 360, 234);
        drawValue(timeStr, 520, 234);
        
        // QR Code Image and Text
        // Matches the original DTS layout: 80pt square QR code aligned with table's right area
        // Height aligns nicely with the header title (top ~ 30), bottom at 110, text at 119, leaving clean 4-5pt space before table top line (125)
        const qrSize = 80;
        const qrX = 495;
        page.drawImage(qrCodeImage, {
            x: qrX,
            y: height - (110 + offset), // Top of QR at ~ 30+offset, bottom at 110+offset
            width: qrSize,
            height: qrSize,
        });
        
        const qrTextWidth = helvetica.widthOfTextAtSize(leave.dtsQrCode!, 9);
        const qrTextX = qrX + (qrSize / 2) - (qrTextWidth / 2);
        // Text baseline at 119 leaves 4pt space above the table border at 125
        page.drawText(leave.dtsQrCode!, { x: qrTextX, y: height - (119 + offset), size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
        
        // Divider
        if (offset < 510) {
            page.drawLine({ start: { x: 0, y: height - (255 + offset) }, end: { x: pageWidth, y: height - (255 + offset) }, thickness: 1, color: rgb(0, 0, 0) });
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
