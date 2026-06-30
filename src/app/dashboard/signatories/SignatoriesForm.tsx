"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignatoriesForm({ profile }: { profile: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    office: profile.office || "",
    recName: profile.recName || "",
    recPos: profile.recPos || "",
    signatoryName: profile.signatoryName || "",
    signatoryPos: profile.signatoryPos || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSuccess(true);
        router.refresh();
      } else {
        alert("Failed to save signatories.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving signatories.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Office & Department</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Office / Department Name</label>
          <input
            type="text"
            name="office"
            value={formData.office}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Recommending Approval</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
            <input
              type="text"
              name="recName"
              value={formData.recName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
            <input
              type="text"
              name="recPos"
              value={formData.recPos}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Final Approval</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
            <input
              type="text"
              name="signatoryName"
              value={formData.signatoryName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
            <input
              type="text"
              name="signatoryPos"
              value={formData.signatoryPos}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="pt-6 flex items-center justify-end space-x-4 border-t border-slate-100">
        {success && <span className="text-green-600 font-medium">Signatories saved!</span>}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white font-semibold py-2.5 px-8 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Signatories"}
        </button>
      </div>
    </form>
  );
}
