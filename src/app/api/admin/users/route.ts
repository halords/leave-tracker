import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminProfile = await prisma.profile.findUnique({
      where: { email: session.user.email },
    });

    if (!adminProfile || adminProfile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden. Admins only." }, { status: 403 });
    }

    const { email, password, vacationBalance, sickBalance, privilegeBalance, wellnessBalance, forcedBalance } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const existingUser = await prisma.profile.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already exists." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.profile.create({
      data: {
        email,
        passwordHash,
        role: "USER",
        vacationBalance: vacationBalance !== undefined ? Number(vacationBalance) : 15.00,
        sickBalance: sickBalance !== undefined ? Number(sickBalance) : 15.00,
        privilegeBalance: privilegeBalance !== undefined ? Number(privilegeBalance) : 3.00,
        wellnessBalance: wellnessBalance !== undefined ? Number(wellnessBalance) : 5.00,
        forcedBalance: forcedBalance !== undefined ? Number(forcedBalance) : 5.00,
      },
    });

    // Don't send hash back
    const { passwordHash: _, ...userSafe } = newUser;

    return NextResponse.json({ success: true, user: userSafe }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
