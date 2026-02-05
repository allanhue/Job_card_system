"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

export default function Home() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  useEffect(() => {
    fetchAnalytics();
    fetchRecentJobCards();

    const interval = setInterval(() => {
      fetchAnalytics();
      fetchRecentJobCards();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

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
          return {
            id: String(jc.id),
            type,
            handler: jc.client_name || jc.email || "Unknown",
            invoice_number: jc.invoice_number || "N/A",
            timestamp: formatTimeAgo(jc.created_at),
            status: jc.status,
            email: jc.email,
          } as ActivityLog;
        });
        setActivityLogs(logs);
      }
    } catch {
      setActivityLogs([]);
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

  const BarChart = () => {
    if (!analytics) return null;
    const statuses = Object.entries(analytics.status_breakdown).filter(
      ([status]) => status !== "draft"
    );
    const maxCount = Math.max(...statuses.map(([, count]) => count));

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md hover:shadow-lg transition-all">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Invoice Status Overview</h3>
            <p className="mt-1 text-sm text-slate-500">Distribution by invoice status</p>
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
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

  const stats = [
    {
      label: "Total Revenue",
      value: formatCurrency(analytics.total_revenue),
      color: "from-green-500 to-emerald-600",
    },
    {
      label: "Outstanding",
      value: formatCurrency(analytics.total_outstanding),
      color: "from-amber-500 to-orange-600",
    },
    {
      label: "Paid Invoices",
      value: analytics.paid_count,
      color: "from-blue-500 to-indigo-600",
    },
    {
      label: "Total Invoices",
      value: analytics.total_invoices,
      color: "from-purple-500 to-pink-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="mt-2 text-slate-500 text-sm">Financial insights and recent activity</p>
        </header>

        <OverdueAlert />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BarChart />
          <PieChart />
        </div>

        <ActivityLogs />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-center shadow-md backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className={`mx-auto mb-3 h-10 w-10 rounded-full bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-sm`}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m4-4H8" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
