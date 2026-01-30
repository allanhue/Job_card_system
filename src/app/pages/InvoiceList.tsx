"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface Invoice {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  customer_id: string;
  date: string;
  due_date: string;
  total: number;
  balance: number;
  status: string;
  currency_code: string;
  line_items?: LineItem[];
}

interface LineItem {
  line_item_id?: string;
  item_id?: string;
  name: string;
  description?: string;
  rate: number;
  quantity: number;
  item_total: number;
  status?: string;
}

export default function InvoiceList() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams?.get("status") || "all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [loadingInvoiceDetails, setLoadingInvoiceDetails] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  useEffect(() => {
    fetchInvoices(statusFilter);
  }, [statusFilter]);

  const fetchInvoices = async (status: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/zoho_books/books/invoices?status=${status}`);

      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }

      const result = await response.json();

      if (result.success && result.data?.invoices) {
        setInvoices(result.data.invoices);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceDetails = async (invoiceId: string) => {
    setLoadingInvoiceDetails(true);
    try {
      const response = await fetch(`${API_URL}/zoho_books/books/invoices/${invoiceId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch invoice details");
      }

      const result = await response.json();

      if (result.success && result.data?.invoice) {
        setSelectedInvoice(result.data.invoice);
        setShowJobModal(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice details");
    } finally {
      setLoadingInvoiceDetails(false);
    }
  };

  const handleApplyJob = (invoice: Invoice) => {
    fetchInvoiceDetails(invoice.invoice_id);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "overdue":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "sent":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "draft":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "partially_paid":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Invoices</h1>
            <p className="mt-2 text-gray-400">Manage and apply for job cards</p>
          </div>
          <button className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 font-medium text-white transition-all hover:shadow-lg hover:shadow-indigo-500/30">
            New Invoice
          </button>
        </div>

        {/* Status Filters */}
        <div className="rounded-2xl border border-[#2a2a38] bg-[#1a1a24] p-4">
          <div className="flex flex-wrap gap-2">
            {["all", "sent", "overdue", "paid", "unpaid", "draft", "partially_paid"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all ${
                  statusFilter === status
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                    : "border border-[#2a2a38] bg-[#13131a] text-gray-400 hover:border-indigo-500/50 hover:text-white"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-2xl border border-[#2a2a38] bg-[#1a1a24] p-12 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-400">Loading invoices...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="font-medium text-red-400">Error: {error}</p>
          </div>
        )}

        {/* Invoices Table */}
        {!loading && !error && invoices.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-[#2a2a38] bg-[#1a1a24]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#2a2a38] bg-[#13131a]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Invoice #
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Due Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Balance
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a38]">
                  {invoices.map((invoice) => {
                    const daysUntilDue = getDaysUntilDue(invoice.due_date);
                    return (
                      <tr key={invoice.invoice_id} className="transition-colors hover:bg-[#13131a]">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-medium text-indigo-400">
                            {invoice.invoice_number}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white">{invoice.customer_name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-400">{formatDate(invoice.date)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className="text-sm text-gray-400">{formatDate(invoice.due_date)}</span>
                            {daysUntilDue >= 0 && daysUntilDue <= 7 && invoice.status !== "paid" && (
                              <span className="ml-2 text-xs text-amber-400">
                                ({daysUntilDue}d left)
                              </span>
                            )}
                            {daysUntilDue < 0 && invoice.status !== "paid" && (
                              <span className="ml-2 text-xs text-red-400">
                                ({Math.abs(daysUntilDue)}d overdue)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-white">
                            {formatCurrency(invoice.total, invoice.currency_code)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-white">
                            {formatCurrency(invoice.balance, invoice.currency_code)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleApplyJob(invoice)}
                            disabled={loadingInvoiceDetails}
                            className="rounded-lg border border-indigo-500/50 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-400 transition-all hover:bg-indigo-500/20 disabled:opacity-50"
                          >
                            Apply Job
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && invoices.length === 0 && (
          <div className="rounded-2xl border border-[#2a2a38] bg-[#1a1a24] p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-500/20">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">No invoices found</h3>
            <p className="mt-2 text-gray-400">
              No invoices match the filter: <strong className="text-indigo-400">{statusFilter}</strong>
            </p>
          </div>
        )}

        {/* Stats Footer */}
        {!loading && invoices.length > 0 && (
          <div className="rounded-2xl border border-[#2a2a38] bg-[#1a1a24] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                Showing <strong className="text-white">{invoices.length}</strong> invoice{invoices.length !== 1 ? "s" : ""}
              </span>
              <span className="text-gray-400">
                Total: <strong className="text-white">{formatCurrency(invoices.reduce((sum, inv) => sum + inv.total, 0))}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Job Application Modal */}
      {showJobModal && selectedInvoice && (
        <JobCardModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowJobModal(false);
            setSelectedInvoice(null);
          }}
          apiUrl={API_URL}
        />
      )}
    </div>
  );
}

// Job Card Application Modal Component
function JobCardModal({ 
  invoice, 
  onClose, 
  apiUrl 
}: { 
  invoice: Invoice; 
  onClose: () => void;
  apiUrl: string;
}) {
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, { status: string; quantity: number }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const lineItems = invoice.line_items || [];

  const toggleItemStatus = (itemId: string, status: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        status,
        quantity: prev[itemId]?.quantity || 1
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const selectedLineItems = lineItems
        .filter(item => selectedItems[item.line_item_id || item.item_id || ""])
        .map(item => ({
          ...item,
          status: selectedItems[item.line_item_id || item.item_id || ""].status
        }));

      const response = await fetch(`${apiUrl}/zoho_books/books/job-cards/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          invoice_id: invoice.invoice_id,
          selected_items: selectedLineItems,
          notes
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit job card application");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: invoice.currency_code || "USD",
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2a2a38] bg-[#1a1a24] shadow-2xl">
        {success ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">Application Submitted!</h2>
            <p className="mt-2 text-gray-400">Your job card application has been received.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2a2a38] p-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Apply for Job Card</h2>
                <p className="mt-1 text-sm text-gray-400">Invoice: {invoice.invoice_number}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg border border-[#2a2a38] p-2 text-gray-400 transition-colors hover:border-red-500/50 hover:text-red-400"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Invoice Details */}
              <div className="rounded-xl border border-[#2a2a38] bg-[#13131a] p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-400">Customer</p>
                    <p className="mt-1 font-medium text-white">{invoice.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Amount</p>
                    <p className="mt-1 font-medium text-white">{formatCurrency(invoice.total)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Due Date</p>
                    <p className="mt-1 font-medium text-white">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                      invoice.status === "paid" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Your Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="mt-2 w-full rounded-lg border border-[#2a2a38] bg-[#13131a] px-4 py-3 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select Items & Status <span className="text-red-400">*</span>
                </label>
                <div className="space-y-3">
                  {lineItems.map((item, index) => {
                    const itemId = item.line_item_id || item.item_id || `item-${index}`;
                    const isSelected = !!selectedItems[itemId];
                    
                    return (
                      <div
                        key={itemId}
                        className={`rounded-lg border p-4 transition-all ${
                          isSelected
                            ? "border-indigo-500/50 bg-indigo-500/5"
                            : "border-[#2a2a38] bg-[#13131a]"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                toggleItemStatus(itemId, "pending");
                              } else {
                                setSelectedItems(prev => {
                                  const newItems = { ...prev };
                                  delete newItems[itemId];
                                  return newItems;
                                });
                              }
                            }}
                            className="mt-1 h-5 w-5 rounded border-[#2a2a38] bg-[#13131a] text-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-white">{item.name}</p>
                                {item.description && (
                                  <p className="mt-1 text-sm text-gray-400">{item.description}</p>
                                )}
                              </div>
                              <p className="text-sm font-medium text-white">
                                {formatCurrency(item.item_total || item.rate * item.quantity)}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="mt-3">
                                <select
                                  value={selectedItems[itemId].status}
                                  onChange={(e) => toggleItemStatus(itemId, e.target.value)}
                                  className="w-full rounded-lg border border-[#2a2a38] bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Any additional information..."
                  className="mt-2 w-full rounded-lg border border-[#2a2a38] bg-[#13131a] px-4 py-3 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-[#2a2a38] px-6 py-3 font-medium text-gray-300 transition-all hover:border-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || Object.keys(selectedItems).length === 0 || !email}
                  className="flex-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 font-medium text-white transition-all hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}