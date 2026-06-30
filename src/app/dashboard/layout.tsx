import Navbar from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />
      <main className="pb-12 pt-4">
        {children}
      </main>
    </div>
  );
}
