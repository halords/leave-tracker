import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminUsersList from "./AdminUsersList";

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const profile = await prisma.profile.findUnique({
    where: { email: session.user.email },
  });

  if (!profile || profile.role !== "ADMIN") {
    redirect("/dashboard"); // Kick non-admins out
  }

  // Fetch all users
  const allUsers = await prisma.profile.findMany({
    orderBy: { email: 'asc' }
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="mb-4">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">User Management</h1>
        <p className="text-slate-500 mt-2">Add and manage employees who can access the leave tracker.</p>
      </div>

      <AdminUsersList initialUsers={allUsers} />
    </div>
  );
}
