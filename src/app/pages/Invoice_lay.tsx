"use client";

import { Invoice } from "./InvoiceList";

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
                    value={new Date().toISOString().split('T')[0]}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
                    title="Current date (auto-generated)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={new Date().toTimeString().slice(0, 5)}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
                    title="Current time (auto-generated)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0.0"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Task Type</label>
                  <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none">
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-orange-400 transition-colors">
                  <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium text-orange-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Document Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Documents
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-400 transition-colors">
                  <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium text-orange-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 5MB</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Voice Recording Section */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="font-medium text-gray-900 mb-3 sm:mb-4">Voice Recording</h3>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors w-full sm:w-auto"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Start Recording
              </button>
              
              <div className="flex-1 w-full">
                <div className="bg-gray-100 rounded-lg h-2">
                  <div className="bg-red-500 h-2 rounded-lg" style={{width: '0%'}}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">00:00 / 00:00</p>
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
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Who Did the Job <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="">Select person...</option>
                <option value="john.smith">John Smith - john.smith@example.com</option>
                <option value="sarah.johnson">Sarah Johnson - sarah.johnson@example.com</option>
                <option value="mike.wilson">Mike Wilson - mike.wilson@example.com</option>
                <option value="emily.davis">Emily Davis - emily.davis@example.com</option>
                <option value="robert.brown">Robert Brown - robert.brown@example.com</option>
                <option value="lisa.martinez">Lisa Martinez - lisa.martinez@example.com</option>
                <option value="david.lee">David Lee - david.lee@example.com</option>
                <option value="jennifer.white">Jennifer White - jennifer.white@example.com</option>
                <option value="chris.taylor">Chris Taylor - chris.taylor@example.com</option>
                <option value="amanda.anderson">Amanda Anderson - amanda.anderson@example.com</option>
              </select>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-1 9a1 1 0 112 0 1 1 0 01-2 0z"/>
                  </svg>
                  Team Lead
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  </svg>
                  Certified
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462a1 1 0 00.95-.69l1.07-3.292a1 1 0 00-.1-1.371c-.3-.921-1.603-.921-1.902 0L9.049 2.927zM9.05 6.925a1 1 0 000 2l1.07 3.292a1 1 0 00.95.69h3.462a1 1 0 00.95-.69L11.05 9.25a1 1 0 00-.1-1.371c-.3-.921-1.603-.921-1.902 0L9.05 6.925z"/>
                  </svg>
                  Senior
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Job Status <span className="text-red-500">*</span>
            </label>
            <select
              required
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
            <button className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 font-medium text-white transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-lg hover:shadow-orange-500/30 order-1 sm:order-2">
              Send Email Notification
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}