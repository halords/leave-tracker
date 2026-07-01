import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // Verify auth header if provided by Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const currentYear = new Date().getFullYear();
    const profiles = await prisma.profile.findMany();

    // Calculate increments
    for (const profile of profiles) {
      let description = "Monthly Increment";
      let vacationAdded = 1.25;
      let sickAdded = 1.25;
      let privilegeAdded = 0;
      let wellnessAdded = 0;
      let forcedAdded = 0;
      let vacationDeducted = 0;

      const dataToUpdate: any = {
        vacationBalance: profile.vacationBalance + vacationAdded,
        sickBalance: profile.sickBalance + sickAdded,
        lastIncrementDate: new Date(),
      };

      const currentMonth = new Date().getMonth(); // 0 is January

      // Reset annual leaves if it's a new year AND the current month is January
      if (currentMonth === 0 && (!profile.lastAnnualResetYear || profile.lastAnnualResetYear < currentYear)) {
        description = "Annual Reset & Monthly Increment";
        
        // If they didn't use all their Forced Leave, deduct the remainder from Vacation Leave
        if (profile.forcedBalance && profile.forcedBalance > 0) {
          vacationDeducted = profile.forcedBalance;
          dataToUpdate.vacationBalance = dataToUpdate.vacationBalance - vacationDeducted;
        }

        privilegeAdded = 3.00 - profile.privilegeBalance; // technical diff for tracking
        wellnessAdded = 5.00 - profile.wellnessBalance;
        forcedAdded = 5.00 - (profile.forcedBalance || 0);

        dataToUpdate.privilegeBalance = 3.00;
        dataToUpdate.wellnessBalance = 5.00;
        dataToUpdate.forcedBalance = 5.00;
        dataToUpdate.lastAnnualResetYear = currentYear;
      } else if (!profile.lastAnnualResetYear) {
        // If it's not January, but lastAnnualResetYear is null (e.g. newly created user or app just deployed), 
        // we should just set the year so it doesn't trigger unexpectedly next month
        dataToUpdate.lastAnnualResetYear = currentYear;
      }

      await prisma.profile.update({
        where: { id: profile.id },
        data: dataToUpdate,
      });

      await prisma.leaveIncrement.create({
        data: {
          profileId: profile.id,
          description,
          vacationAdded,
          sickAdded,
          privilegeAdded: privilegeAdded > 0 ? privilegeAdded : 3.00, // Display logic simplification
          wellnessAdded: wellnessAdded > 0 ? wellnessAdded : 5.00,
          forcedAdded: forcedAdded > 0 ? forcedAdded : 5.00,
          vacationDeducted,
        }
      });
    }

    return NextResponse.json({ success: true, message: `Processed ${profiles.length} profiles.` });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: "Failed to process cron job" }, { status: 500 });
  }
}
