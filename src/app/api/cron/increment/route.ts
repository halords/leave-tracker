import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized Hook Execution', { status: 401 });
  }

  try {
    const profiles = await prisma.profile.findMany();
    for (const p of profiles) {
      await prisma.profile.update({
        where: { id: p.id },
        data: {
          vacationBalance: p.vacationBalance + 1.25,
          sickBalance: p.sickBalance + 1.25,
          lastIncrementDate: new Date(),
        }
      });
    }

    return NextResponse.json({ success: true, message: "Balances updated safely (+1.25)" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Cron transactional update failed" }, { status: 500 });
  }
}
