"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LeaveFormModal({ profile }: { profile: any }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: "Vacation",
    workingDays: 1,
    datesApplied: "",
    startDate: "",
    endDate: "",
    leaveDetails: "",
    isMonetization: false,
  });

  useEffect(() => {
    if (["Vacation", "Special Privilege", "Wellness", "Mandatory/Forced"].includes(formData.leaveType)) {
      if (formData.leaveDetails !== "within" && formData.leaveDetails !== "abroad") {
        setFormData((prev) => ({ ...prev, leaveDetails: "within" }));
      }
    } else if (formData.leaveType === "Sick") {
      if (formData.leaveDetails !== "inpatient" && formData.leaveDetails !== "outpatient") {
        setFormData((prev) => ({ ...prev, leaveDetails: "outpatient" }));
      }
    } else {
      setFormData((prev) => ({ ...prev, leaveDetails: "" }));
    }
  }, [formData.leaveType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const isMone = formData.isMonetization || formData.leaveType === "Monetization";
    if (!isMone && (!formData.startDate || !formData.endDate)) {
      alert("Please select dates.");
      setLoading(false);
      return;
    }

    if (formData.leaveType === "Mandatory/Forced" && profile.forcedBalance < formData.workingDays) {
      alert(`Insufficient Mandatory/Forced Leave balance. You have ${profile.forcedBalance} days left.`);
      setLoading(false);
      return;
    }

    if (formData.leaveType === "Wellness" && profile.wellnessBalance < formData.workingDays) {
      alert(`Insufficient Wellness Leave balance. You have ${profile.wellnessBalance} days left.`);
      setLoading(false);
      return;
    }
    
    if (formData.leaveType === "Special Privilege" && profile.privilegeBalance < formData.workingDays) {
      alert(`Insufficient Special Privilege Leave balance. You have ${profile.privilegeBalance} days left.`);
      setLoading(false);
      return;
    }

    let datesApplied = "";
    if (isMone && (!formData.startDate || !formData.endDate)) {
      datesApplied = "N/A (Monetization)";
    } else {
      const start = new Date(formData.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      const end = new Date(formData.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      
      const startObj = new Date(formData.startDate);
      const endObj = new Date(formData.endDate);
      
      datesApplied = `${start}-${end}`;
      if (startObj.getMonth() === endObj.getMonth() && startObj.getFullYear() === endObj.getFullYear()) {
        if (startObj.getDate() === endObj.getDate()) {
          datesApplied = end;
        } else {
          datesApplied = `${startObj.toLocaleDateString('en-US', { month: 'long' })} ${startObj.getDate()}-${endObj.getDate()}, ${endObj.getFullYear()}`;
        }
      }
    }

    const payload = {
      ...formData,
      isMonetization: formData.isMonetization || formData.leaveType === "Monetization",
      profileId: profile.id,
      datesApplied,
    };

    const res = await fetch("/api/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setIsOpen(false);
      setFormData({ leaveType: "Vacation", workingDays: 1, datesApplied: "", startDate: "", endDate: "", leaveDetails: "", isMonetization: false } as any);
      router.refresh();
    } else {
      alert("Failed to submit leave. Check balances.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        // Compute difference in days, inclusive
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setFormData((prev) => ({ ...prev, workingDays: diffDays }));
      }
    }
  }, [formData.startDate, formData.endDate]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all active:scale-95"
      >
        + File Leave
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">File a Leave</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {!(formData.isMonetization || formData.leaveType === "Monetization") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      required={!(formData.isMonetization || formData.leaveType === "Monetization")}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                      value={formData.startDate || ""}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          startDate: newStart,
                          // Seamless: if end date is missing or earlier than new start date, update it automatically
                          endDate: (!prev.endDate || prev.endDate < newStart) ? newStart : prev.endDate
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      required={!(formData.isMonetization || formData.leaveType === "Monetization")}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                      value={formData.endDate || ""}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                >
                  <option value="Vacation">Vacation Leave</option>
                  <option value="Monetization">Monetization</option>
                  {profile.forcedBalance > 0 && <option value="Mandatory/Forced">Mandatory/Forced Leave</option>}
                  <option value="Sick">Sick Leave</option>
                  {profile.gender !== "Male" && <option value="Maternity">Maternity Leave</option>}
                  <option value="Paternity">Paternity Leave</option>
                  {profile.privilegeBalance > 0 && <option value="Special Privilege">Special Privilege Leave</option>}
                  <option value="Solo Parent">Solo Parent Leave</option>
                  <option value="Study">Study Leave</option>
                  {profile.gender !== "Male" && <option value="VAWC">10-Day VAWC Leave</option>}
                  <option value="Rehabilitation">Rehabilitation Privilege</option>
                  <option value="Special Leave Benefits for Women">Special Leave Benefits for Women</option>
                  <option value="Special Emergency (Calamity)">Special Emergency (Calamity) Leave</option>
                  <option value="Adoption">Adoption Leave</option>
                  {profile.wellnessBalance > 0 && <option value="Wellness">Wellness Leave</option>}
                </select>
              </div>

              {formData.leaveType === "Sick" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Sick Leave Context</label>
                  <div className="flex space-x-6">
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="context" value="inpatient" 
                        checked={formData.leaveDetails === "inpatient"} 
                        onChange={(e) => setFormData({...formData, leaveDetails: e.target.value})}
                        className="text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">In Patient</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="context" value="outpatient" 
                        checked={formData.leaveDetails === "outpatient"} 
                        onChange={(e) => setFormData({...formData, leaveDetails: e.target.value})}
                        className="text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">Out Patient</span>
                    </label>
                  </div>
                </div>
              )}

              {!formData.isMonetization && ["Vacation", "Special Privilege", "Wellness", "Mandatory/Forced"].includes(formData.leaveType) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Location Context</label>
                  <div className="flex space-x-6">
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="context" value="within" 
                        checked={formData.leaveDetails === "within"} 
                        onChange={(e) => setFormData({...formData, leaveDetails: e.target.value})}
                        className="text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">Within the Philippines</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="radio" name="context" value="abroad" 
                        checked={formData.leaveDetails === "abroad"} 
                        onChange={(e) => setFormData({...formData, leaveDetails: e.target.value})}
                        className="text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700">Abroad</span>
                    </label>
                  </div>
                </div>
              )}

              {formData.leaveType === "Vacation" && (
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isMonetization || false}
                      onChange={(e) => setFormData({...formData, isMonetization: e.target.checked})}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                    />
                    <span className="text-sm font-medium text-slate-700">Request Commutation (Monetization)</span>
                  </label>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Working Days</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={formData.workingDays}
                  onChange={(e) => setFormData({ ...formData, workingDays: parseInt(e.target.value) })}
                />
              </div>


              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
