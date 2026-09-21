import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { dtsDocumentId, dtsTransactionNo, dtsQrCode } = await req.json();

    if (!dtsDocumentId || !dtsTransactionNo || !dtsQrCode) {
      return NextResponse.json({ error: "Missing required DTS data" }, { status: 400 });
    }

    const leave = await prisma.leave.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    // Update the leave with DTS details
    const updatedLeave = await prisma.leave.update({
      where: { id },
      data: {
        dtsDocumentId,
        dtsTransactionNo,
        dtsQrCode,
        dtsSubmittedAt: new Date(),
      },
    });

    revalidateTag("profile");

    return NextResponse.json({ success: true, leave: updatedLeave });
  } catch (error: any) {
    console.error("Error updating leave with DTS data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update leave with DTS data" },
      { status: 500 }
    );
  }
}
