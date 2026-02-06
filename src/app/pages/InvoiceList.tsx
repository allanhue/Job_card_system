"use client";

import { useState, useEffect } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { useSearchParams } from "next/navigation";
import JobCardModal from "./Invoice_lay";

export interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  client_address: string | null;
  client_phone: string | null;
  title: string;
  description: string | null;
  amount: number;
  tax_rate: number;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
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

export default function InvoiceList({
  initialStatus,
  initialView,
}: {
  initialStatus?: string;
  initialView?: string;
} = {}) {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    initialStatus || searchParams?.get("status") || "all"
  );
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [loadingInvoiceDetails, setLoadingInvoiceDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [autoOpened, setAutoOpened] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  useEffect(() => {
    fetchInvoices(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    if (initialStatus && initialStatus !== statusFilter) {
      setStatusFilter(initialStatus);
    }
  }, [initialStatus, statusFilter]);

  useEffect(() => {
    if (initialView === "activity" && statusFilter !== "all") {
      setStatusFilter("all");
    }
  }, [initialView, statusFilter]);

  useEffect(() => {
    const openId = initialView ? null : searchParams?.get("openInvoice");
    if (!openId || autoOpened) return;
    setAutoOpened(true);
    fetchInvoiceDetails(openId);
  }, [searchParams, autoOpened, initialView]);

  const fetchInvoices = async (status: string) => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      let url = `${API_URL}/invoices`;
      
      if (status !== "all") {
        url += `?status=${status}`;
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error("Failed to fetch invoices");
      const result = await response.json();
      setInvoices(result);
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
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/invoices/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch invoice details");
      const result = await response.json();
      setSelectedInvoice(result);
      setShowJobModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice details");
    } finally {
      setLoadingInvoiceDetails(false);
    }
  };

  const syncZohoInvoices = async () => {
    setSyncing(true);
    setSyncError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/zoho_books/books/invoices/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to sync Zoho invoices");
      await fetchInvoices(statusFilter);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Failed to sync Zoho invoices");
    } finally {
      setSyncing(false);
    }
  };
  const handleApplyJob = (invoice: Invoice) => {
    fetchInvoiceDetails(invoice.id.toString());
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-[var(--accent-success)]/10 text-[var(--accent-success)] border-[var(--accent-success)]/30";
      case "overdue":
        return "bg-[var(--accent-danger)]/10 text-[var(--accent-danger)] border-[var(--accent-danger)]/30";
      case "sent":
        return "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30";
      case "draft":
        return "bg-[var(--foreground-muted)]/10 text-[var(--foreground-muted)] border-[var(--foreground-muted)]/30";
      case "partially_paid":
        return "bg-[var(--accent-warning)]/10 text-[var(--accent-warning)] border-[var(--accent-warning)]/30";
      default:
        return "bg-[var(--accent-tertiary)]/10 text-[var(--accent-tertiary)] border-[var(--accent-tertiary)]/30";
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[var(--background)] px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 py-10 text-[var(--foreground-muted)]">
          <LoadingSpinner size={22} />
          <span className="text-sm">Loading invoices...</span>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-[var(--background)] px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Error: {error}
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8 sm:px-6 lg:px-8 text-[var(--foreground)]">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            {loading && <LoadingSpinner size={18} />}
            <button
              onClick={syncZohoInvoices}
              disabled={syncing}
              className="btn border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 disabled:opacity-50"
            >
              {syncing ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size={14} />
                  Syncing...
                </span>
              ) : (
                "Sync Zoho"
              )}
            </button>
            <button className="btn btn-primary">New Invoice</button>
          </div>
        </div>

        {syncError && (
          <div className="card border-[var(--accent-danger)]/40 bg-[var(--accent-danger)]/10 text-[var(--accent-danger)] p-4 font-medium">
            {syncError}
          </div>
        )}

        {/* Filters */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--background-card)] p-4">
          <div className="flex flex-wrap gap-2">
            {["all", "sent", "overdue", "paid", "unpaid", "draft", "partially_paid"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all ${
                  statusFilter === status
                    ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white"
                    : "border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground-muted)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="card text-center py-12">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent-primary)] border-t-transparent"></div>
            <p className="mt-4 text-[var(--foreground-muted)]">Loading invoices...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card border-[var(--accent-danger)]/40 bg-[var(--accent-danger)]/10 text-[var(--accent-danger)] p-4 font-medium">
            {error}
          </div>
        )}

        {/* Table */}
        {!loading && !error && invoices.length > 0 && (
          <div className="table-container">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    {["Invoice #", "Customer", "Date", "Due Date", "Amount", "Balance", "Status", "Action"].map(
                      (col) => (
                        <th key={col}>{col}</th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const daysUntilDue = invoice.due_date ? getDaysUntilDue(invoice.due_date) : null;
                    return (
                      <tr key={invoice.id}>
                        <td>
                          <span className="font-mono text-[var(--accent-primary)]">
                            {invoice.invoice_number}
                          </span>
                        </td>
                        <td>{invoice.client_name}</td>
                        <td>{formatDate(invoice.issue_date)}</td>
                        <td>
                          <div>
                            {invoice.due_date && formatDate(invoice.due_date)}{" "}
                            {daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7 && invoice.status !== "paid" && (
                              <span className="ml-1 text-xs text-[var(--accent-warning)]">
                                ({daysUntilDue}d left)
                              </span>
                            )}
                            {daysUntilDue !== null && daysUntilDue < 0 && invoice.status !== "paid" && (
                              <span className="ml-1 text-xs text-[var(--accent-danger)]">
                                ({Math.abs(daysUntilDue)}d overdue)
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{formatCurrency(invoice.total_amount)}</td>
                        <td>{formatCurrency(invoice.total_amount)}</td>
                        <td>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase ${getStatusColor(
                              invoice.status
                            )}`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleApplyJob(invoice)}
                            disabled={loadingInvoiceDetails}
                            className="btn border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 disabled:opacity-50"
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

        {/* Empty */}
        {!loading && !error && invoices.length === 0 && (
          <div className="card text-center py-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--foreground-muted)]/10">
              <svg
                className="h-8 w-8 text-[var(--foreground-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">No invoices found</h3>
            <p className="mt-2 text-[var(--foreground-muted)]">
              No invoices match the filter:{" "}
              <strong className="text-[var(--accent-primary)]">{statusFilter}</strong>
            </p>
          </div>
        )}

        {/* Footer */}
        {!loading && invoices.length > 0 && (
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--background-elevated)] p-4 text-sm">
            <div className="flex items-center justify-between text-[var(--foreground-muted)]">
              <span>
                Showing <strong className="text-[var(--foreground)]">{invoices.length}</strong>{" "}
                invoice{invoices.length !== 1 ? "s" : ""}
              </span>
              <span>
                Total:{" "}
                <strong className="text-[var(--foreground)]">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total_amount, 0))}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      <JobCardModal
        showJobModal={showJobModal}
        selectedInvoice={selectedInvoice}
        onClose={() => {
          setShowJobModal(false);
          setSelectedInvoice(null);
        }}
        getStatusColor={getStatusColor}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
