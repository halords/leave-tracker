export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-8 w-48 bg-slate-200 rounded-md"></div>
        <div className="h-10 w-32 bg-slate-200 rounded-md"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center h-40">
            <div className="h-4 w-32 bg-slate-200 rounded mb-4"></div>
            <div className="h-12 w-24 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex space-x-4 border-b border-slate-200 pb-2">
          <div className="h-6 w-24 bg-slate-200 rounded"></div>
          <div className="h-6 w-24 bg-slate-200 rounded"></div>
        </div>
        <div className="mt-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 w-full bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
