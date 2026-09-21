"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitLeaveToDts, generateDtsSubject } from "@/lib/dts-client";

interface LeaveItem {
  id: string;
  leaveType: string;
  datesApplied: string;
  workingDays: number;
  dateFiled: Date | string;
  isMonetization: boolean;
  status: string;
  cancellationReason?: string | null;
  dtsDocumentId?: number | null;
  dtsTransactionNo?: string | null;
  dtsQrCode?: string | null;
}

interface LeaveIncrementItem {
  id: string;
  description: string;
  vacationAdded: number;
  sickAdded: number;
  vacationDeducted: number;
  createdAt: Date | string;
}

export default function HistoryTabs({ 
  leaves, 
  leaveIncrements 
}: { 
  leaves: LeaveItem[]; 
  leaveIncrements: LeaveIncrementItem[]; 
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"leave" | "increment">("leave");
  const [selectedLeaveToCancel, setSelectedLeaveToCancel] = useState<LeaveItem | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [dtsLoadingId, setDtsLoadingId] = useState<string | null>(null);

  const handleDtsSubmit = async (leave: LeaveItem) => {
    setDtsLoadingId(leave.id);
    setActionError("");

    try {
      const p = await fetch("/api/auth/session").then(r => r.json());
      const user = p?.user;
      
      const response = await submitLeaveToDts({
        leaveId: leave.id,
        doc_name: generateDtsSubject(user?.name || "User", leave.leaveType, leave.datesApplied, leave.workingDays),
        document_date: new Date(leave.dateFiled).toISOString(),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to submit to DTS");
      }

      // Save to database
      const saveRes = await fetch(`/api/leaves/${leave.id}/update-dts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dtsDocumentId: response.data.dtsDocumentId,
          dtsTransactionNo: response.data.dtsTransactionNo,
          dtsQrCode: response.data.dtsQrCode,
        }),
      });

      if (!saveRes.ok) {
        throw new Error("Submitted to DTS, but failed to save in local database");
      }

      router.refresh();
    } catch (err: any) {
      setActionError(err.message || "An error occurred with DTS submission");
      // Could show a toast here instead of actionError which is used for the modal
      alert(`DTS Error: ${err.message}`);
    } finally {
      setDtsLoadingId(null);
    }
  };

  const handleCancelLeave = async () => {
    if (!selectedLeaveToCancel) return;
    setLoading(true);
    setActionError("");

    try {
      const res = await fetch(`/api/leaves/${selectedLeaveToCancel.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancellationReason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel leave");
      }

      setSelectedLeaveToCancel(null);
      setCancellationReason("");
      router.refresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white overflow-hidden mt-8">
      
      {/* Tabs Header */}
      <div className="flex items-center space-x-2 px-6 pt-6 pb-4 border-b border-slate-100">
        <button
          onClick={() => setActiveTab("leave")}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
            activeTab === "leave" 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20" 
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          }`}
        >
          Leave History
        </button>
        <button
          onClick={() => setActiveTab("increment")}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
            activeTab === "increment" 
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20" 
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          }`}
        >
          Leave Increments
        </button>
      </div>

      {/* Tab Content */}
      <div className="overflow-x-auto p-2">
        {activeTab === "leave" && (
          <table className="w-full text-left">
            <thead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Dates Applied</th>
                <th className="px-6 py-4">Working Days</th>
                <th className="px-6 py-4">Date Filed</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No leaves found.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => {
                  const isCancelled = leave.status === "CANCELLED";
                  return (
                    <tr 
                      key={leave.id} 
                      className={`hover:bg-slate-50 transition-colors group ${
                        isCancelled ? "bg-slate-50/50 opacity-75" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-700 flex items-center gap-2">
                          <span className={isCancelled ? "line-through text-slate-400" : ""}>
                            {leave.leaveType}
                          </span>
                          {leave.isMonetization && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Monetized
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-4 ${isCancelled ? "text-slate-400 line-through" : "text-slate-500"}`}>
                        {leave.datesApplied}
                      </td>
                      <td className={`px-6 py-4 font-medium ${isCancelled ? "text-slate-400 line-through" : "text-slate-500"}`}>
                        {leave.workingDays}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(leave.dateFiled).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {isCancelled ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center w-fit px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                              Cancelled
                            </span>
                            {leave.cancellationReason && (
                              <span className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[150px]" title={leave.cancellationReason}>
                                {leave.cancellationReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center justify-end gap-2 max-w-[200px]">
                          {!isCancelled && !leave.dtsDocumentId && (
                            <button
                              onClick={() => handleDtsSubmit(leave)}
                              disabled={dtsLoadingId === leave.id}
                              className="inline-flex items-center justify-center px-3.5 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm font-semibold hover:bg-amber-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                            >
                              {dtsLoadingId === leave.id ? "Submitting..." : "Submit to DTS"}
                            </button>
                          )}
                          {!isCancelled && leave.dtsDocumentId && (
                            <Link 
                              href={`/api/leaves/${leave.id}/dts-receipt`}
                              target="_blank"
                              className="inline-flex items-center justify-center px-3.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-semibold hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            >
                              DTS Receipt
                            </Link>
                          )}
                          <Link 
                            href={`/dashboard/print/${leave.id}`}
                            className="inline-flex items-center justify-center px-3.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          >
                            Print Form 6
                          </Link>
                          {!isCancelled && (
                            <button
                              onClick={() => setSelectedLeaveToCancel(leave)}
                              className="inline-flex items-center justify-center px-3.5 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-sm font-semibold hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {activeTab === "increment" && (
          <table className="w-full text-left">
            <thead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Vacation Added</th>
                <th className="px-6 py-4">Sick Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leaveIncrements.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No increment history found.
                  </td>
                </tr>
              ) : (
                leaveIncrements.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-600 whitespace-nowrap">
                      {new Date(inc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-slate-700 font-medium">{inc.description}</span>
                        {inc.vacationDeducted > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                            -{inc.vacationDeducted} Forced Penalty
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-sm">
                        +{inc.vacationAdded}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-sm">
                        +{inc.sickAdded}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {selectedLeaveToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mb-4 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Cancel Leave Application</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              Are you sure you want to cancel your <span className="font-semibold text-slate-700">{selectedLeaveToCancel.leaveType}</span> leave for <span className="font-semibold text-slate-700">{selectedLeaveToCancel.datesApplied}</span> ({selectedLeaveToCancel.workingDays} working day(s))? 
              <br />
              <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">
                ✓ Any deducted days will be automatically refunded to your balance.
              </span>
            </p>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g., Change in schedule, event postponed..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm resize-none"
              />
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-medium text-rose-600 text-center">
                {actionError}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedLeaveToCancel(null);
                  setActionError("");
                  setCancellationReason("");
                }}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors text-sm"
              >
                Keep Leave
              </button>
              <button
                type="button"
                onClick={handleCancelLeave}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50 text-sm shadow-md shadow-rose-600/20"
              >
                {loading ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
