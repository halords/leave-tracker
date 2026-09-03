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
  let reason: string | undefined;
  try {
    const body = await req.json();
    reason = body?.reason;
  } catch {
    // Body is optional
  }

  try {
    const userProfile = await prisma.profile.findUnique({
      where: { email: session.user.email },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const leave = await prisma.leave.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    // Only owner of the leave or ADMIN can cancel
    if (leave.profileId !== userProfile.id && userProfile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (leave.status === "CANCELLED") {
      return NextResponse.json({ error: "Leave is already cancelled" }, { status: 400 });
    }

    const targetProfile = leave.profile;
    const workingDays = leave.workingDays;
    const leaveType = leave.leaveType;

    // Refund logic based on leave type
    const profileUpdateData: any = {};

    if (leaveType === "Vacation" || leaveType === "Monetization") {
      profileUpdateData.vacationBalance = targetProfile.vacationBalance + workingDays;
    } else if (leaveType === "Mandatory/Forced") {
      profileUpdateData.vacationBalance = targetProfile.vacationBalance + workingDays;
      profileUpdateData.forcedBalance = targetProfile.forcedBalance + workingDays;
    } else if (leaveType === "Sick") {
      profileUpdateData.sickBalance = targetProfile.sickBalance + workingDays;
    } else if (leaveType === "Special Privilege") {
      profileUpdateData.privilegeBalance = targetProfile.privilegeBalance + workingDays;
    } else if (leaveType === "Wellness") {
      profileUpdateData.wellnessBalance = targetProfile.wellnessBalance + workingDays;
    }

    // Perform updates
    if (Object.keys(profileUpdateData).length > 0) {
      await prisma.profile.update({
        where: { id: targetProfile.id },
        data: profileUpdateData,
      });
    }

    const updatedLeave = await prisma.leave.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason || null,
      },
    });

    revalidateTag("profile", "max");
    revalidateTag("users", "max");

    return NextResponse.json({
      success: true,
      message: "Leave successfully cancelled and balances refunded.",
      leave: updatedLeave,
    });
  } catch (error: any) {
    console.error("Error cancelling leave:", error);
    return NextResponse.json({ error: "Failed to cancel leave" }, { status: 500 });
  }
}
