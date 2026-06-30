import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function PUT(req: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();

    const updatedProfile = await prisma.profile.update({
      where: { email: session.user.email },
      data: {
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        position: data.position,
        salary: data.salary,
        office: data.office,
        signatoryName: data.signatoryName,
        signatoryPos: data.signatoryPos,
        recName: data.recName,
        recPos: data.recPos,
        gender: data.gender,
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
