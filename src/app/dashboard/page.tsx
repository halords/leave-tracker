import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import LeaveFormModal from "@/components/LeaveFormModal";
import HistoryTabs from "@/components/HistoryTabs";
import LogoutButton from "@/components/LogoutButton";

const getCachedProfile = unstable_cache(
  async (email: string) => {
    return prisma.profile.findUnique({
      where: { email },
      include: { 
        leaves: { orderBy: { dateFiled: 'desc' } },
        leaveIncrements: { orderBy: { createdAt: 'desc' } }
      },
    });
  },
  ['profile-data'],
  { tags: ['profile'] }
);

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const profile = await getCachedProfile(session.user.email);

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <h1 className="text-xl font-bold text-slate-800">Profile not found.</h1>
        <p className="text-slate-500">Your account may have been modified. Please log out and log back in.</p>
        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Overview</h1>
        <LeaveFormModal profile={profile} />
      </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-xl shadow-blue-900/5 border border-blue-50/50 flex flex-col items-center justify-center relative hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent rounded-3xl pointer-events-none"></div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 z-10 group-hover:text-blue-500 transition-colors">Vacation Balance</h2>
            <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-600 z-10">{profile.vacationBalance.toFixed(2)}</p>
            <div className="mt-4 text-xs font-bold text-slate-500 bg-white shadow-sm px-4 py-1.5 rounded-full border border-slate-100 z-10">
              Forced Remaining: <span className="text-orange-500">{profile.forcedBalance.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-xl shadow-red-900/5 border border-red-50/50 flex flex-col items-center justify-center relative hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-900/10 transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent rounded-3xl pointer-events-none"></div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 z-10 group-hover:text-red-500 transition-colors">Sick Balance</h2>
            <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-rose-600 z-10">{profile.sickBalance.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-50/50 flex flex-col items-center justify-center relative hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-900/10 transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent rounded-3xl pointer-events-none"></div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 text-center z-10 group-hover:text-purple-500 transition-colors">Privilege Balance</h2>
            <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-500 to-fuchsia-600 z-10">{profile.privilegeBalance.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-xl shadow-teal-900/5 border border-teal-50/50 flex flex-col items-center justify-center relative hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-900/10 transition-all duration-300 group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-transparent rounded-3xl pointer-events-none"></div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 text-center z-10 group-hover:text-teal-500 transition-colors">Wellness Balance</h2>
            <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-teal-500 to-emerald-600 z-10">{profile.wellnessBalance.toFixed(2)}</p>
          </div>
        </div>

        <HistoryTabs leaves={profile.leaves} leaveIncrements={profile.leaveIncrements} />
    </div>
  );
}
