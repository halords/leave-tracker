import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SignatoriesForm from "./SignatoriesForm";

export default async function SignatoriesPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const profile = await prisma.profile.findUnique({
    where: { email: session.user.email },
  });

  if (!profile) {
    return <div>Profile not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Signatories & Office</h1>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <SignatoriesForm profile={profile} />
      </div>
    </div>
  );
}
