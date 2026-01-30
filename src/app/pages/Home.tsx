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

  // ✅ Smaller, more compact Stat Card
  const StatCard = ({
    title,
    value,
    change,
    icon,
    color,
  }: {
    title: string;
    value: string | number;
    change?: string;
    icon: React.ReactNode;
    color: string;
  }) => (
    <div className="group relative overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--background-card)] p-3 transition-all hover:border-[var(--accent-primary)]/50 hover:shadow-sm hover:shadow-[var(--accent-primary)]/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--foreground-muted)]">{title}</p>
          <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{value}</p>
          {change && <p className="mt-1 text-xs text-[var(--foreground-muted)]">{change}</p>}
        </div>
        <div className={`rounded-md bg-gradient-to-br ${color} p-1.5 text-white`}>{icon}</div>
      </div>
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );

  const StatusChart = () => {
    if (!analytics) return null;

    // Filter out draft invoices and only show paid invoices
    const statuses = Object.entries(analytics.status_breakdown).filter(([status]) => status !== 'draft');
    const total = statuses.reduce((sum, [, count]) => sum + count, 0);

    const color = {
      paid: "from-green-500 to-emerald-600",
      overdue: "from-red-500 to-rose-600",
      sent: "from-blue-500 to-indigo-600",
      default: "from-purple-500 to-violet-600",
    };

    return (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--background-card)] p-5">
        <h3 className="mb-4 text-base font-semibold text-[var(--foreground)]">
          Invoice Status Overview (Excluding Drafts)
        </h3>
        <div className="space-y-3">
          {statuses.map(([status, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={status}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="capitalize text-[var(--foreground-muted)]">{status}</span>
                  <span className="text-[var(--foreground-muted)]">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--background-elevated)]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${
                      color[status as keyof typeof color] || color.default
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const RecentInvoices = () =>
    analytics?.recent_invoices?.length ? (
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--background-card)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Recent Invoices</h3>
          <Link
            href="/invoices"
            className="text-xs font-medium text-[var(--accent-primary)] hover:text-[var(--accent-secondary)]"
          >
            View All →
          </Link>
        </div>
        <div className="space-y-2">
          {analytics.recent_invoices.map((invoice) => (
            <div
              key={invoice.invoice_id}
              className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--background-elevated)] px-3 py-2 text-sm hover:border-[var(--accent-primary)]/40"
            >
              <div>
                <p className="font-medium text-[var(--foreground)]">{invoice.invoice_number}</p>
                <p className="text-xs text-[var(--foreground-muted)]">{invoice.customer_name}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[var(--foreground)]">{formatCurrency(invoice.total)}</p>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    invoice.status === "paid"
                      ? "bg-green-100 text-green-700"
                      : invoice.status === "overdue"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  const OverdueAlert = () =>
    analytics?.overdue_count ? (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-red-100 p-2 text-red-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-red-700">Overdue Invoices</h3>
            <p className="mt-1 text-gray-700">
              {analytics.overdue_count} overdue invoice
              {analytics.overdue_count !== 1 ? "s" : ""} need attention.
            </p>
            <Link
              href="/invoices?status=overdue"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Review
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    ) : null;

  if (loading)
    return (
      <div className="min-h-screen bg-[var(--background)] px-4 py-8">
        <div className="mx-auto max-w-7xl grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-[var(--background-elevated)]" />
          ))}
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-[var(--background)] px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Error: {error}
          </div>
        </div>
      </div>
    );

  if (!analytics) return null;

  return (
    <div className="min-h-screen bg-[var(--background)] px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--foreground)]">Dashboard</h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--foreground-muted)]">
            Overview of your job cards and invoices
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(analytics.total_revenue)}
            icon={<CurrencyIcon />}
            color="from-[var(--accent-primary)] to-[var(--accent-secondary)]"
          />
          <StatCard
            title="Outstanding"
            value={formatCurrency(analytics.total_outstanding)}
            icon={<FileIcon />}
            color="from-amber-500 to-orange-600"
          />
          <StatCard
            title="Paid Invoices"
            value={analytics.paid_count}
            change={`${analytics.total_invoices} total`}
            icon={<CheckIcon />}
            color="from-green-500 to-emerald-600"
          />
          <StatCard
            title="Unpaid"
            value={analytics.unpaid_count}
            change={`${analytics.overdue_count} overdue`}
            icon={<ClockIcon />}
            color="from-red-500 to-rose-600"
          />
        </div>

        <OverdueAlert />

        {/* Charts + Recents */}
        <div className="grid gap-4 lg:grid-cols-2">
          <StatusChart />
          <RecentInvoices />
        </div>

        {/* Activity Logs */}
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--background-card)] p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
            <h3 className="text-sm sm:text-base font-semibold text-[var(--foreground)]">Job Card Activity Logs</h3>
            <Link 
              href="/invoices?view=activity"
              className="text-xs sm:text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-secondary)]"
            >
              View All Activity →
            </Link>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {/* Sample activity logs - in real app, this would come from API */}
            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-[var(--background-elevated)]">
              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <p className="text-xs sm:text-sm font-medium text-[var(--foreground)] truncate">Job Completed</p>
                  <p className="text-xs text-[var(--foreground-muted)]">2 hours ago</p>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  <span className="font-medium">John Smith</span> completed job for invoice #INV-2024-001
                </p>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Status: <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Completed</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-[var(--background-elevated)]">
              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <p className="text-xs sm:text-sm font-medium text-[var(--foreground)] truncate">Job Application Submitted</p>
                  <p className="text-xs text-[var(--foreground-muted)]">5 hours ago</p>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  <span className="font-medium">Sarah Johnson</span> applied for job card for invoice #INV-2024-002
                </p>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Email: sarah.johnson@example.com
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-[var(--background-elevated)]">
              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <p className="text-xs sm:text-sm font-medium text-[var(--foreground)] truncate">Job In Progress</p>
                  <p className="text-xs text-[var(--foreground-muted)]">1 day ago</p>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  <span className="font-medium">Mike Wilson</span> started work on invoice #INV-2024-003
                </p>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Status: <span className="inline-block px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">In Progress</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-[var(--background-elevated)]">
              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <p className="text-xs sm:text-sm font-medium text-[var(--foreground)] truncate">Job Completed</p>
                  <p className="text-xs text-[var(--foreground-muted)]">2 days ago</p>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  <span className="font-medium">Emily Davis</span> completed job for invoice #INV-2024-004
                </p>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Total hours logged: 8.5h
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-[var(--background-elevated)]">
              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <p className="text-xs sm:text-sm font-medium text-[var(--foreground)] truncate">Job Application Submitted</p>
                  <p className="text-xs text-[var(--foreground-muted)]">3 days ago</p>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  <span className="font-medium">Robert Brown</span> applied for job card for invoice #INV-2024-005
                </p>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Status: <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">Pending</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrencyIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V7l-5-5H7a2 2 0 00-2 2v16a2 2 0 002 2z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
    </svg>
  );
}

function ActionLink({
  href,
  title,
  subtitle,
  color,
}: {
  href: string;
  title: string;
  subtitle: string;
  color: string;
}) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-200 hover:border-blue-400",
    red: "bg-red-50 border-red-200 hover:border-red-400",
    green: "bg-green-50 border-green-200 hover:border-green-400",
  }[color as "blue" | "red" | "green"];

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg border ${colorMap} p-3 transition-all`}
    >
      <div className="flex-1">
        <p className="font-medium text-[var(--foreground)] text-sm">{title}</p>
        <p className="text-xs text-[var(--foreground-muted)]">{subtitle}</p>
      </div>
    </Link>
  );
}
