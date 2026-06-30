"use client";

import { useState } from "react";
import Link from "next/link";

export default function HistoryTabs({ leaves, leaveIncrements }: { leaves: any[], leaveIncrements: any[] }) {
  const [activeTab, setActiveTab] = useState<"leave" | "increment">("leave");

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
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No leaves found.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-slate-700">{leave.leaveType}</td>
                    <td className="px-6 py-4 text-slate-500">{leave.datesApplied}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{leave.workingDays}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(leave.dateFiled).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <Link 
                        href={`/dashboard/print/${leave.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        Print PDF
                      </Link>
                    </td>
                  </tr>
                ))
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
    </div>
  );
}
