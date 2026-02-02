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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/zoho_books/books/analytics/overview`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const result = await res.json();
      if (result.success && result.data) setAnalytics(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  // Mock activity logs - in production, fetch from API
  const activityLogs: ActivityLog[] = [
    {
      id: "1",
      type: "completed",
      handler: "John Smith",
      invoice_number: "INV-2024-001",
      timestamp: "2 hours ago",
      status: "Completed",
      hours: 8.5,
    },
    {
      id: "2",
      type: "application",
      handler: "Sarah Johnson",
      invoice_number: "INV-2024-002",
      timestamp: "5 hours ago",
      email: "sarah.johnson@example.com",
    },
    {
      id: "3",
      type: "in_progress",
      handler: "Mike Wilson",
      invoice_number: "INV-2024-003",
      timestamp: "1 day ago",
      status: "In Progress",
    },
    {
      id: "4",
      type: "completed",
      handler: "Emily Davis",
      invoice_number: "INV-2024-004",
      timestamp: "2 days ago",
      hours: 12.0,
    },
    {
      id: "5",
      type: "application",
      handler: "Robert Brown",
      invoice_number: "INV-2024-005",
      timestamp: "3 days ago",
      status: "Pending",
    },
    {
      id: "6",
      type: "assigned",
      handler: "Alice Cooper",
      invoice_number: "INV-2024-006",
      timestamp: "4 days ago",
      status: "Assigned",
    },
  ];

  // Handler distribution data
  const handlerDistribution = activityLogs.reduce((acc, log) => {
    acc[log.handler] = (acc[log.handler] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const BarChart = () => {
    if (!analytics) return null;

    const statuses = Object.entries(analytics.status_breakdown).filter(
      ([status]) => status !== "draft"
    );
    const maxCount = Math.max(...statuses.map(([, count]) => count));

    const colors: Record<string, string> = {
      paid: "#10b981",
      overdue: "#ef4444",
      sent: "#3b82f6",
      unpaid: "#f59e0b",
      default: "#8b5cf6",
    };

    return (
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Invoice Status</h3>
            <p className="mt-1 text-sm text-slate-500">Current distribution by status</p>
          </div>
          <div className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-3 shadow-md">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
        </div>

        <div className="space-y-6">
          {statuses.map(([status, count]) => {
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const color = colors[status as keyof typeof colors] || colors.default;

            return (
              <div key={status} className="group">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-lg font-semibold capitalize text-slate-700">
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-slate-900">{count}</span>
                    <span className="text-sm text-slate-500">invoices</span>
                  </div>
                </div>
                <div className="relative h-12 overflow-hidden rounded-xl bg-slate-100">
                  <div
                    className="h-full rounded-xl transition-all duration-700 ease-out"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: color,
                      boxShadow: `0 4px 14px ${color}40`,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center px-4">
                    <span className="text-sm font-medium text-slate-700">
                      {percentage.toFixed(0)}% of max
                    </span>
                  </div>
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

    const colors = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
      "#06b6d4",
    ];

    let cumulativePercentage = 0;

    return (
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Handler Distribution</h3>
            <p className="mt-1 text-sm text-slate-500">Invoices by team member</p>
          </div>
          <div className="rounded-full bg-gradient-to-br from-purple-500 to-pink-600 p-3 shadow-md">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
        </div>

        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-between">
          {/* SVG Pie Chart */}
          <div className="relative">
            <svg width="240" height="240" viewBox="0 0 240 240" className="drop-shadow-xl">
              <circle cx="120" cy="120" r="100" fill="#f1f5f9" />
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
                    fill={colors[index % colors.length]}
                    className="transition-all duration-300 hover:opacity-80"
                    style={{
                      filter: `drop-shadow(0 2px 8px ${colors[index % colors.length]}40)`,
                    }}
                  />
                );
              })}
              <circle cx="120" cy="120" r="60" fill="white" />
              <text
                x="120"
                y="115"
                textAnchor="middle"
                className="text-3xl font-bold"
                fill="#1e293b"
              >
                {total}
              </text>
              <text
                x="120"
                y="135"
                textAnchor="middle"
                className="text-sm"
                fill="#64748b"
              >
                Total Jobs
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div className="w-full space-y-3 lg:w-auto">
            {handlers.map(([handler, count], index) => {
              const percentage = ((count / total) * 100).toFixed(1);
              return (
                <div
                  key={handler}
                  className="flex items-center justify-between gap-6 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full shadow-sm"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="font-semibold text-slate-700">{handler}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">{count}</div>
                    <div className="text-xs text-slate-500">{percentage}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const ActivityLogs = () => {
    const getActivityIcon = (type: ActivityLog["type"]) => {
      switch (type) {
        case "completed":
          return (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 12l2 2 4-4"
                />
              </svg>
            </div>
          );
        case "application":
          return (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 shadow-lg">
              <svg
                className="h-6 w-6 text-white"
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
          );
        case "in_progress":
          return (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-600 shadow-lg">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          );
        case "assigned":
          return (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-violet-600 shadow-lg">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          );
      }
    };

    const getActivityTitle = (type: ActivityLog["type"]) => {
      switch (type) {
        case "completed":
          return "Job Completed";
        case "application":
          return "Application Submitted";
        case "in_progress":
          return "Job In Progress";
        case "assigned":
          return "Job Assigned";
      }
    };

    return (
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Activity Logs</h3>
            <p className="mt-1 text-sm text-slate-500">Recent job card activities</p>
          </div>
          <Link
            href="/invoices?view=activity"
            className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
          >
            View All →
          </Link>
        </div>

        <div className="space-y-4">
          {activityLogs.map((log) => (
            <div
              key={log.id}
              className="group relative overflow-hidden rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 transition-all hover:border-slate-300 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                {getActivityIcon(log.type)}

                <div className="flex-1">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">
                        {getActivityTitle(log.type)}
                      </h4>
                      <p className="mt-1 text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">{log.handler}</span>{" "}
                        • {log.invoice_number}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                      {log.timestamp}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {log.status && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          log.status === "Completed"
                            ? "bg-green-100 text-green-700"
                            : log.status === "In Progress"
                            ? "bg-orange-100 text-orange-700"
                            : log.status === "Assigned"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {log.status}
                      </span>
                    )}
                    {log.hours && (
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                        {log.hours}h logged
                      </span>
                    )}
                    {log.email && (
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                        {log.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Decorative gradient line */}
              <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const OverdueAlert = () =>
    analytics?.overdue_count ? (
      <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-gradient-to-br from-red-500 to-rose-600 p-3 shadow-lg">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-red-900">Urgent: Overdue Invoices</h3>
            <p className="mt-1 text-slate-700">
              {analytics.overdue_count} invoice{analytics.overdue_count !== 1 ? "s" : ""}{" "}
              require immediate attention
            </p>
            <Link
              href="/invoices?status=overdue"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
            >
              Review Now
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    ) : null;

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-96 animate-pulse rounded-2xl bg-white/50 shadow-lg"
            />
          ))}
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-semibold text-red-900">Error: {error}</span>
            </div>
          </div>
        </div>
      </div>
    );

  if (!analytics) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Overdue Alert */}
        <OverdueAlert />

        {/* Bar Chart - Invoice Status */}
        <BarChart />

        {/* Activity Logs */}
        <ActivityLogs />

        {/* Pie Chart - Handler Distribution */}
        <PieChart />

        {/* Quick Stats Footer */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
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
          ].map((stat, index) => (
            <div
              key={index}
              className="rounded-xl border-2 border-white bg-white/80 p-6 text-center shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:shadow-xl"
            >
              <div
                className={`mx-auto mb-3 h-12 w-12 rounded-full bg-gradient-to-br ${stat.color} shadow-lg`}
              />
              <p className="text-sm font-medium text-slate-600">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}