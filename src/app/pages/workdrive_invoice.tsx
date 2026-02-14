"use client";

import { useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

type CheckResponse = {
  success: boolean;
  currency: string;
  statuses: string[];
  books_invoices: number;
  workdrive_files: number;
  matched: number;
  missing: number;
  missing_list: string[];
  email_sent: boolean;
  date_from?: string;
  date_to?: string;
};

const STATUS_OPTIONS = ["paid", "unpaid", "overdue"];

export default function WorkdriveInvoicePage() {
  const [currency, setCurrency] = useState("all");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [rangePreset, setRangePreset] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckResponse | null>(null);

  const toggleStatus = (status: string) => {
    setStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const buildPayload = (withEmail: boolean) => ({
    currency: currency === "all" ? "" : currency,
    statuses,
    email: withEmail && email ? email : null,
    date_from: dateFrom || null,
    date_to: dateTo || null,
  });

  const setRangeDays = (days: number | null) => {
    if (!days) {
      setDateFrom("");
      setDateTo("");
      setRangePreset("all");
      return;
    }
    const today = new Date();
    const to = today.toISOString().split("T")[0];
    const start = new Date();
    start.setDate(today.getDate() - days + 1);
    const from = start.toISOString().split("T")[0];
    setDateFrom(from);
    setDateTo(to);
  };

  const runCheck = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/zoho_wordrive/workdrive/check-invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(false)),
      });
      if (!res.ok) {
        let detail = "Failed to run check";
        try {
          const data = await res.json();
          detail = data?.detail || detail;
        } catch {
          const text = await res.text();
          if (text) detail = text;
        }
        throw new Error(detail);
      }
      const data = (await res.json()) as CheckResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run check");
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!email) {
      setError("Add an email address to send the report.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/zoho_wordrive/workdrive/check-invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(true)),
      });
      if (!res.ok) {
        let detail = "Failed to send email";
        try {
          const data = await res.json();
          detail = data?.detail || detail;
        } catch {
          const text = await res.text();
          if (text) detail = text;
        }
        throw new Error(detail);
      }
      const data = (await res.json()) as CheckResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">WorkDrive Invoice Checker</h1>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Currency</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { label: "All", value: "all" },
                    { label: "KES", value: "KES" },
                    { label: "USD", value: "USD" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCurrency(opt.value)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                        currency === opt.value
                          ? "bg-orange-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Statuses</label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {STATUS_OPTIONS.map((status) => (
                    <label
                      key={status}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium capitalize ${
                        statuses.includes(status)
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={statuses.includes(status)}
                        onChange={() => toggleStatus(status)}
                        className="h-3.5 w-3.5 accent-orange-500"
                      />
                      {status}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Date Range</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { label: "All", value: "all", days: null },
                    { label: "7 days", value: "7d", days: 7 },
                    { label: "14 days", value: "14d", days: 14 },
                    { label: "30 days", value: "30d", days: 30 },
                    { label: "Custom", value: "custom", days: null },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setRangePreset(opt.value);
                        if (opt.value !== "custom") setRangeDays(opt.days);
                      }}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                        rangePreset === opt.value
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {rangePreset === "custom" && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="reports@company.com"
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={runCheck}
                  disabled={loading}
                  className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size={16} variant="light" />
                      Running...
                    </span>
                  ) : (
                    "Run Check"
                  )}
                </button>
                <button
                  onClick={sendEmail}
                  disabled={sending}
                  className="rounded-lg border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-60"
                >
                  {sending ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size={16} />
                      Sending...
                    </span>
                  ) : (
                    "Send Email"
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700">Results</h2>
            {!result && !loading && (
              <p className="mt-3 text-xs text-slate-500">Run a check to see results.</p>
            )}
            {loading && (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <LoadingSpinner size={16} />
                Loading results...
              </div>
            )}
            {result && (
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-slate-500">Books Invoices</p>
                    <p className="mt-1 text-lg font-semibold">{result.books_invoices}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-slate-500">WorkDrive Files</p>
                    <p className="mt-1 text-lg font-semibold">{result.workdrive_files}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
                    <p className="text-green-700/70">Matched</p>
                    <p className="mt-1 text-lg font-semibold">{result.matched}</p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                    <p className="text-red-700/70">Missing</p>
                    <p className="mt-1 text-lg font-semibold">{result.missing}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-600">Missing Invoices</p>
                  {result.missing_list.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">None</p>
                  ) : (
                    <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                      {result.missing_list.slice(0, 24).map((inv) => (
                        <li
                          key={inv}
                          className="rounded-full border border-slate-200 px-3 py-1 text-slate-600"
                        >
                          {inv}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {result.email_sent && (
                  <p className="text-xs text-green-600">Email sent successfully.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
