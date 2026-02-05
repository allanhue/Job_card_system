"use client";

import { useState } from "react";
import { Invoice } from "./InvoiceList";
import { useToast } from "@/app/Utils/toast";
import { useAuth } from "@/app/Utils/auth";
import LoadingSpinner from "@/app/components/LoadingSpinner";

interface JobCardModalProps {
  showJobModal: boolean;
  selectedInvoice: Invoice | null;
  onClose: () => void;
  getStatusColor: (status: string) => string;
  formatCurrency: (amount: number, currency?: string) => string;
}

export default function JobCardModal({ 
  showJobModal, 
  selectedInvoice, 
  onClose, 
  getStatusColor,
  formatCurrency 
}: JobCardModalProps) {
  if (!showJobModal || !selectedInvoice) return null;

  const [email, setEmail] = useState("");
  const [jobStatus, setJobStatus] = useState("pending");
  const [jobDescription, setJobDescription] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [workDate, setWorkDate] = useState(new Date().toISOString().split("T")[0]);
  const [workTime, setWorkTime] = useState(new Date().toTimeString().slice(0, 5));
  const [workHours, setWorkHours] = useState("");
  const [workType, setWorkType] = useState("");
  const [workDesc, setWorkDesc] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [voiceNote, setVoiceNote] = useState<File | null>(null);
  const [users, setUsers] = useState<{ id: number; email: string; full_name?: string; role: string }[]>([]);
  const [assignedUserId, setAssignedUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { pushToast } = useToast();
  const { user } = useAuth();

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/auth/users/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data || []);
      if (user?.id) {
        setAssignedUserId(String(user.id));
      }
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to load users");
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const notes = [jobDescription, additionalNotes].filter(Boolean).join("\n\n");
      const workLogs = [
        {
          date: workDate,
          time: workTime,
          hours: workHours ? Number(workHours) : 0,
          task_type: workType,
          description: workDesc,
        },
      ];

      const okPhotos = validateFiles(photos, 10 * 1024 * 1024, [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ]);
      const okDocs = validateFiles(documents, 5 * 1024 * 1024, [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]);
      const okVoice = voiceNote
        ? validateFiles([voiceNote], 25 * 1024 * 1024, [
            "audio/mpeg",
            "audio/wav",
            "audio/webm",
            "audio/ogg",
            "audio/mp4",
          ])
        : true;
      if (!okPhotos || !okDocs || !okVoice) {
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append("email", email);
      formData.append("status", jobStatus || "pending");
      formData.append("notes", notes);
      formData.append("selected_items", JSON.stringify([]));
      formData.append("work_logs", JSON.stringify(workLogs));
      if (assignedUserId) {
        formData.append("assigned_user_id", assignedUserId);
      }
      photos.forEach((file) => formData.append("photos", file));
      documents.forEach((file) => formData.append("documents", file));
      if (voiceNote) formData.append("voice_note", voiceNote);

      const res = await fetch(`${API_URL}/job-cards/invoice/${selectedInvoice.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to submit job card");
      pushToast("success", "Job card submitted successfully.");
      setJobDescription("");
      setAdditionalNotes("");
      setWorkHours("");
      setWorkType("");
      setWorkDesc("");
      setPhotos([]);
      setDocuments([]);
      setVoiceNote(null);
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to submit job card");
    } finally {
      setSubmitting(false);
    }
  };

  const validateFiles = (files: File[], maxBytes: number, allowed: string[]) => {
    for (const file of files) {
      if (!allowed.includes(file.type)) {
        pushToast("error", `Invalid file type: ${file.name}`);
        return false;
      }
      if (file.size > maxBytes) {
        pushToast("error", `File too large: ${file.name}`);
        return false;
      }
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Apply for Job Card</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Invoice Details */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="font-medium text-gray-900 mb-3 sm:mb-4">Invoice Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs sm:text-sm">Invoice Number</p>
                <p className="font-medium text-gray-900 text-sm sm:text-base">{selectedInvoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs sm:text-sm">Customer</p>
                <p className="font-medium text-gray-900 text-sm sm:text-base">{selectedInvoice.client_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs sm:text-sm">Total Amount</p>
                <p className="font-medium text-gray-900 text-sm sm:text-base">{formatCurrency(selectedInvoice.total_amount)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs sm:text-sm">Status</p>
                <span className={`inline-flex rounded-full border px-2 sm:px-3 py-1 text-xs font-semibold uppercase ${getStatusColor(selectedInvoice.status)}`}>
                  {selectedInvoice.status}
                </span>
              </div>
            </div>
            
            {/* Job Description */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                placeholder="Describe the work performed, materials used, and any important details about this job..."
              />
            </div>
          </div>

          {/* Work Logs Section */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
              <h3 className="font-medium text-gray-900">Work Logs & Time Tracking</h3>
              <button
                type="button"
                className="text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                + Add Time Entry
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={workTime}
                    onChange={(e) => setWorkTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0.0"
                    value={workHours}
                    onChange={(e) => setWorkHours(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Task Type</label>
                  <select
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="labor">Labor</option>
                    <option value="materials">Materials</option>
                    <option value="equipment">Equipment</option>
                    <option value="consultation">Consultation</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Work Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe what was done during this time..."
                  value={workDesc}
                  onChange={(e) => setWorkDesc(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="font-medium text-gray-900 mb-3 sm:mb-4">Documents & Photos</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Photos
                </label>
                <label htmlFor="photo-upload" className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-orange-400 transition-colors cursor-pointer block">
                  <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium text-orange-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhotos(Array.from(e.target.files || []))}
                />
              </div>

              {/* Document Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Documents
                </label>
                <label htmlFor="doc-upload" className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-400 transition-colors cursor-pointer block">
                  <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium text-orange-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 5MB</p>
                </label>
                <input
                  id="doc-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setDocuments(Array.from(e.target.files || []))}
                />
              </div>
            </div>
          </div>

          {/* Voice Recording Section */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="font-medium text-gray-900 mb-3 sm:mb-4">Voice Recording</h3>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <label className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors w-full sm:w-auto cursor-pointer">
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setVoiceNote(e.target.files?.[0] || null)}
                />
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Upload Voice Note
              </label>
              
              <div className="flex-1 w-full">
                <p className="text-xs text-gray-500 mt-1">
                  {voiceNote ? `Selected: ${voiceNote.name}` : "No voice note selected"}
                </p>
              </div>
            </div>
            
            <div className="mt-3 text-sm text-gray-600">
              <p>Record voice notes about the job progress, issues, or additional details.</p>
            </div>
          </div>

          {/* Contact and Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Your Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Who Did the Job <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Search user..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
              />
              <select
                required
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                onFocus={() => {
                  if (users.length === 0) fetchUsers();
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="">Select person...</option>
                {users
                  .filter((u) => {
                    const q = userSearch.toLowerCase();
                    return (
                      u.email.toLowerCase().includes(q) ||
                      (u.full_name || "").toLowerCase().includes(q)
                    );
                  })
                  .map((u) => (
                  <option key={u.id} value={u.id}>
                    {(u.full_name || u.email) + " - " + u.email}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap gap-1">
                {users
                  .filter((u) => String(u.id) === assignedUserId)
                  .map((u) => (
                    <span
                      key={u.id}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {u.role === "admin" ? "Admin" : "User"}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Job Status <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={jobStatus}
              onChange={(e) => setJobStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="">Select job status...</option>
              <option value="pending">Pending - Job not started</option>
              <option value="in_progress">In Progress - Job currently being worked on</option>
              <option value="completed">Completed - Job finished</option>
              <option value="on_hold">On Hold - Job temporarily paused</option>
              <option value="cancelled">Cancelled - Job cancelled</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select the current status of this job for email notification
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Additional Notes
            </label>
            <textarea
              rows={4}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              placeholder="Any additional information about the job status or requirements..."
            />
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="font-medium text-orange-800">Email Notification</p>
                <p className="text-orange-700 mt-1">
                  Based on the job status selected, an appropriate email notification will be sent to update all relevant parties about the current state of this job card.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 sticky bottom-0 bg-white border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-all hover:bg-gray-50 order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 font-medium text-white transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-lg hover:shadow-orange-500/30 order-1 sm:order-2 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <LoadingSpinner size={16} variant="light" />}
              Send Email Notification
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
