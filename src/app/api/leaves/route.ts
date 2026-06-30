import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leaveType, workingDays, datesApplied, profileId, leaveDetails, isMonetization } = await req.json();

  if (!leaveType || !workingDays || !datesApplied || !profileId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // Handle balance deductions
    if (leaveType === "Vacation" || leaveType === "Monetization") {
      if (profile.vacationBalance < workingDays) {
        return NextResponse.json({ error: "Insufficient vacation balance" }, { status: 400 });
      }
      await prisma.profile.update({
        where: { id: profileId },
        data: { vacationBalance: profile.vacationBalance - workingDays },
      });
    } else if (leaveType === "Mandatory/Forced") {
      if (profile.forcedBalance < workingDays || profile.vacationBalance < workingDays) {
        return NextResponse.json({ error: "Insufficient Mandatory/Forced or Vacation balance" }, { status: 400 });
      }
      await prisma.profile.update({
        where: { id: profileId },
        data: { 
          vacationBalance: profile.vacationBalance - workingDays,
          forcedBalance: profile.forcedBalance - workingDays
        },
      });
    } else if (leaveType === "Sick") {
      if (profile.sickBalance < workingDays) {
        return NextResponse.json({ error: "Insufficient sick balance" }, { status: 400 });
      }
      await prisma.profile.update({
        where: { id: profileId },
        data: { sickBalance: profile.sickBalance - workingDays },
      });
    } else if (leaveType === "Special Privilege") {
      if (profile.privilegeBalance < workingDays) {
        return NextResponse.json({ error: "Insufficient Special Privilege balance" }, { status: 400 });
      }
      await prisma.profile.update({
        where: { id: profileId },
        data: { privilegeBalance: profile.privilegeBalance - workingDays },
      });
    } else if (leaveType === "Wellness") {
      if (profile.wellnessBalance < workingDays) {
        return NextResponse.json({ error: "Insufficient Wellness balance" }, { status: 400 });
      }
      await prisma.profile.update({
        where: { id: profileId },
        data: { wellnessBalance: profile.wellnessBalance - workingDays },
      });
    }

    const leave = await prisma.leave.create({
      data: {
        profileId,
        leaveType,
        workingDays,
        datesApplied,
        leaveDetails: leaveDetails || null,
        isMonetization: isMonetization || false,
      },
    });

    return NextResponse.json(leave);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
