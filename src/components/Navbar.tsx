import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "./LogoutButton";
import NavbarLinks from "./NavbarLinks";

export default async function Navbar() {
  const session = await getServerSession();
  
  if (!session?.user?.email) {
    return null;
  }

  const profile = await prisma.profile.findUnique({
    where: { email: session.user.email },
    select: { role: true, firstName: true }
  });

  if (!profile) return null;

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-12">
          <Link href="/dashboard" className="text-2xl font-black text-slate-900 tracking-tight">
            Leave<span className="text-blue-600">Tracker</span>
          </Link>
          <NavbarLinks role={profile.role} />
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-slate-500">Hello, {profile.firstName || session.user.email}</span>
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
