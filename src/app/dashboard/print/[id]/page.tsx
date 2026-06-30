import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const { id } = await params;

  if (!session?.user?.email) {
    redirect("/login");
  }

  const leave = await prisma.leave.findUnique({
    where: { id },
    include: { profile: true },
  });

  if (!leave) {
    return <div>Leave record not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Print Form No. 6</h1>
        <Link 
          href="/dashboard"
          className="text-slate-500 hover:text-slate-700 transition-colors font-medium"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="w-full h-screen border border-slate-200 rounded-lg overflow-hidden bg-slate-100 shadow-sm">
        <iframe
          src={`/api/leaves/${id}/pdf?t=${Date.now()}`}
          className="w-full h-full border-none"
          title="Civil Service Form No. 6"
        />
      </div>
    </div>
  );
}
