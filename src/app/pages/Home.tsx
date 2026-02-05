"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { useAuth } from "@/app/Utils/auth";

interface AnalyticsData {
  total_invoices: number;
  total_revenue: number;
  total_outstanding: number;
  paid_count: number;
  unpaid_count: number;
  overdue_count: number;
  status_breakdown: Record<string, number>;
  recent_invoices: any[];
  overdue_invoices: any[];
}

interface ActivityLog {
  id: string;
  type: "completed" | "application" | "in_progress" | "assigned";
  handler: string;
  invoice_number: string;
  timestamp: string;
  status?: string;
  hours?: number;
  email?: string;
}

interface JobCardStats {
  series: { date: string; count: number }[];
  hours_series?: { date: string; hours: number }[];
  status_counts: Record<string, number>;
  total_jobs?: number;
  total_hours?: number;
  total_attachments?: number;
  top_customers?: { name: string; count: number }[];
}

export default function Home() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [jobCardStats, setJobCardStats] = useState<JobCardStats | null>(null);
  const [viewMode, setViewMode] = useState<"summary" | "detailed">("summary");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  useEffect(() => {
    fetchAnalytics();
    fetchRecentJobCards();
    fetchJobCardStats();

    const interval = setInterval(() => {
      fetchAnalytics();
      fetchRecentJobCards();
      fetchJobCardStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [statusFilter]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/invoices/analytics/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const result = await res.json();
      if (result.success && result.data) setAnalytics(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentJobCards = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/job-cards/recent?limit=6`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      const result = await res.json();
      if (result.success && result.data) {
        const logs = result.data.map((jc: any) => {
          const status = (jc.status || "pending").toLowerCase();
          const type =
            status === "completed"
              ? "completed"
              : status === "in_progress"
              ? "in_progress"
              : status === "assigned"
              ? "assigned"
              : "application";
          const hours = Array.isArray(jc.work_logs)
            ? jc.work_logs.reduce((sum: number, log: any) => sum + (Number(log.hours) || 0), 0)
            : 0;
          return {
            id: String(jc.id),
            type,
            handler:
              jc.assigned_user_name ||
              jc.assigned_user_email ||
              jc.client_name ||
              jc.email ||
              "Unknown",
            invoice_number: jc.invoice_number || "N/A",
            timestamp: formatTimeAgo(jc.created_at),
            status: jc.status,
            email: jc.email,
            hours: hours || undefined,
          } as ActivityLog;
        });
        setActivityLogs(logs);
      }
    } catch {
      setActivityLogs([]);
    }
  };

  const fetchJobCardStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const statusParam = statusFilter !== "all" ? `&status=${statusFilter}` : "";
      const res = await fetch(`${API_URL}/job-cards/stats?days=14${statusParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch job card stats");
      const result = await res.json();
      if (result.success && result.data) setJobCardStats(result.data);
    } catch {
      setJobCardStats(null);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return "just now";
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Handler distribution
  const handlerDistribution = activityLogs.reduce((acc, log) => {
    acc[log.handler] = (acc[log.handler] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const colors: Record<string, string> = {
    paid: "#10b981",
    overdue: "#ef4444",
    sent: "#3b82f6",
    unpaid: "#f59e0b",
    default: "#8b5cf6",
  };

  const InvoiceStatusBar = () => {
    if (!analytics) return null;
    const statuses = Object.entries(analytics.status_breakdown).filter(
      ([status]) => status !== "draft"
    );
    const maxCount = Math.max(...statuses.map(([, count]) => count));

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-lg transition-all">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Invoice Status</h3>
            <p className="mt-1 text-sm text-slate-500">Current invoice distribution</p>
          </div>
        </header>

        <div className="space-y-6">
          {statuses.map(([status, count]) => {
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const color = colors[status] || colors.default;

            return (
              <div key={status}>
                <div className="flex justify-between mb-2">
                  <span className="capitalize text-slate-700 font-medium">{status}</span>
                  <span className="text-slate-900 font-semibold">{count}</span>
                </div>
                <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const JobStatusBar = () => {
    if (!jobCardStats) return null;
    const statuses = Object.entries(jobCardStats.status_counts);
    const maxCount = Math.max(1, ...statuses.map(([, count]) => count));
    const palette = ["#1d4ed8", "#0ea5e9", "#f97316", "#16a34a", "#ef4444", "#8b5cf6"];

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-lg transition-all">
        <header className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900">Job Status</h3>
          <p className="mt-1 text-sm text-slate-500">Latest job card progression</p>
        </header>

        <div className="space-y-6">
          {statuses.map(([status, count], index) => {
            const percentage = (count / maxCount) * 100;
            return (
              <div key={status}>
                <div className="flex justify-between mb-2">
                  <span className="capitalize text-slate-700 font-medium">{status.replace("_", " ")}</span>
                  <span className="text-slate-900 font-semibold">{count}</span>
                </div>
                <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: palette[index % palette.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const PieChart = () => {
    const handlers = Object.entries(handlerDistribution);
    const total = handlers.reduce((sum, [, count]) => sum + count, 0);
    const palette = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
    let cumulativePercentage = 0;

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-lg transition-all">
        <header className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900">Handler Distribution</h3>
          <p className="mt-1 text-sm text-slate-500">Jobs handled per team member</p>
        </header>

        <div className="flex flex-col items-center gap-8 lg:flex-row">
          <div className="relative">
            <svg width="220" height="220" viewBox="0 0 240 240">
              <circle cx="120" cy="120" r="100" fill="#f8fafc" />
              {handlers.map(([handler, count], index) => {
                const percentage = (count / total) * 100;
                const angle = (percentage / 100) * 360;
                const startAngle = (cumulativePercentage / 100) * 360 - 90;
                const endAngle = startAngle + angle;
                const startX = 120 + 100 * Math.cos((startAngle * Math.PI) / 180);
                const startY = 120 + 100 * Math.sin((startAngle * Math.PI) / 180);
                const endX = 120 + 100 * Math.cos((endAngle * Math.PI) / 180);
                const endY = 120 + 100 * Math.sin((endAngle * Math.PI) / 180);
                const largeArc = angle > 180 ? 1 : 0;
                cumulativePercentage += percentage;

                return (
                  <path
                    key={handler}
                    d={`M 120 120 L ${startX} ${startY} A 100 100 0 ${largeArc} 1 ${endX} ${endY} Z`}
                    fill={palette[index % palette.length]}
                    className="hover:opacity-80 transition"
                  />
                );
              })}
              <circle cx="120" cy="120" r="60" fill="white" />
              <text x="120" y="115" textAnchor="middle" className="text-2xl font-bold" fill="#1e293b">
                {total}
              </text>
              <text x="120" y="135" textAnchor="middle" className="text-xs" fill="#64748b">
                Total Jobs
              </text>
            </svg>
          </div>

          <div className="space-y-3 w-full lg:w-1/2">
            {handlers.map(([handler, count], index) => {
              const percentage = ((count / total) * 100).toFixed(1);
              return (
                <div
                  key={handler}
                  className="flex justify-between items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: palette[index % palette.length] }}
                    />
                    <span className="font-medium text-slate-700">{handler}</span>
                  </div>
                  <span className="text-slate-500">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const EmailLineChart = () => {
    if (!jobCardStats) return null;
    const data = jobCardStats.series;
    if (data.length === 0) return null;

    const width = 520;
    const height = 160;
    const padding = 24;
    const max = Math.max(1, ...data.map((d) => d.count));

    const points = data
      .map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
        const y = height - padding - (d.count / max) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-lg transition-all">
        <header className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900">Emails Sent</h3>
          <p className="mt-1 text-sm text-slate-500">Job card notifications over 14 days</p>
        </header>
        <svg className="w-full h-48" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            points={points}
          />
          <polyline
            fill="url(#lineGlow)"
            stroke="none"
            points={`${points} ${width - padding},${height - padding} ${padding},${height - padding}`}
          />
        </svg>
        <div className="mt-4 flex justify-between text-xs text-slate-500">
          <span>{data[0]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  const HoursLineChart = () => {
    if (!jobCardStats?.hours_series) return null;
    const data = jobCardStats.hours_series;
    if (data.length === 0) return null;

    const width = 520;
    const height = 160;
    const padding = 24;
    const max = Math.max(1, ...data.map((d) => d.hours));

    const points = data
      .map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
        const y = height - padding - (d.hours / max) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-lg transition-all">
        <header className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900">Hours Logged</h3>
          <p className="mt-1 text-sm text-slate-500">Work hours over 14 days</p>
        </header>
        <svg className="w-full h-48" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="hoursGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="#16a34a"
            strokeWidth="3"
            points={points}
          />
          <polyline
            fill="url(#hoursGlow)"
            stroke="none"
            points={`${points} ${width - padding},${height - padding} ${padding},${height - padding}`}
          />
        </svg>
        <div className="mt-4 flex justify-between text-xs text-slate-500">
          <span>{data[0]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  const ActivityLogs = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-lg transition-all">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Recent Activity</h3>
          <p className="text-sm text-slate-500">Latest job updates and invoice actions</p>
        </div>
        <Link
          href="/invoices?view=activity"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          View all &gt;
        </Link>
      </header>

      <div className="space-y-4">
        {activityLogs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-slate-100"
          >
            <div
              className={`h-10 w-10 flex items-center justify-center rounded-full ${
                log.type === "completed"
                  ? "bg-green-500"
                  : log.type === "application"
                  ? "bg-blue-500"
                  : log.type === "in_progress"
                  ? "bg-amber-500"
                  : "bg-purple-500"
              } text-white`}
            >
              <span className="text-sm font-semibold">
                {log.type === "completed"
                  ? "OK"
                  : log.type === "application"
                  ? "APP"
                  : log.type === "in_progress"
                  ? "PROG"
                  : "ASG"}
              </span>
            </div>

            <div className="flex-1">
              <p className="font-medium text-slate-900">{log.handler}</p>
              <p className="text-sm text-slate-600">{log.invoice_number}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                {log.status && (
                  <span className="rounded-full bg-slate-200 px-2 py-1">{log.status}</span>
                )}
                {log.hours && (
                  <span className="rounded-full bg-slate-200 px-2 py-1">{log.hours}h</span>
                )}
                {log.email && (
                  <span className="rounded-full bg-slate-200 px-2 py-1">{log.email}</span>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-400">{log.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const OverdueAlert = () =>
    analytics?.overdue_count ? (
      <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-6 shadow-md">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-red-600 p-3 text-white shadow-md">
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
                d="M12 9v2m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-red-900">Overdue Invoices</h3>
            <p className="text-sm text-slate-600">
              {analytics.overdue_count} invoice
              {analytics.overdue_count !== 1 ? "s" : ""} require immediate attention.
            </p>
            <Link
              href="/invoices?status=overdue"
              className="mt-3 inline-block rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700"
            >
              Review Now →
            </Link>
          </div>
        </div>
      </div>
    ) : null;

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-4">
        <LoadingSpinner size={28} />
        Loading dashboard...
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-600">
        Error: {error}
      </div>
    );

  if (!analytics) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 px-3 sm:px-6 py-6 sm:py-10 page-fade">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics Dashboard</h1>
            <p className="mt-2 text-slate-500 text-sm">Operational insights and job performance</p>
          </div>
          {user?.is_admin && (
            <div className="mt-4 sm:mt-0 flex items-center gap-3">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as "summary" | "detailed")}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="summary">Summary</option>
                <option value="detailed">Detailed</option>
              </select>
              {viewMode === "detailed" && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              )}
            </div>
          )}
        </header>

        <OverdueAlert />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EmailLineChart />
          <InvoiceStatusBar />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <JobStatusBar />
          <PieChart />
        </div>

        {user?.is_admin && viewMode === "detailed" && jobCardStats && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <HoursLineChart />
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Key Totals</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500">Total Job Cards</p>
                    <p className="text-xl font-semibold text-slate-900">{jobCardStats.total_jobs ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500">Total Hours</p>
                    <p className="text-xl font-semibold text-slate-900">{jobCardStats.total_hours ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500">Attachments</p>
                    <p className="text-xl font-semibold text-slate-900">{jobCardStats.total_attachments ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500">Overdue Invoices</p>
                    <p className="text-xl font-semibold text-slate-900">{analytics?.overdue_count ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Jobs By Customer</h3>
                <div className="space-y-3 text-sm">
                  {(jobCardStats.top_customers || []).map((c) => (
                    <div key={c.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-slate-700">{c.name}</span>
                      <span className="text-slate-900 font-semibold">{c.count}</span>
                    </div>
                  ))}
                  {(!jobCardStats.top_customers || jobCardStats.top_customers.length === 0) && (
                    <p className="text-slate-500">No customer data yet.</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Uploads</h3>
                <div className="space-y-3 text-sm">
                  {activityLogs
                    .filter((log) => log.type === "application")
                    .slice(0, 6)
                    .map((log) => (
                      <div key={log.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-slate-700">{log.invoice_number}</span>
                        <span className="text-slate-500">{log.timestamp}</span>
                      </div>
                    ))}
                  {activityLogs.length === 0 && (
                    <p className="text-slate-500">No uploads yet.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <ActivityLogs />
      </div>
    </div>
  );
}
