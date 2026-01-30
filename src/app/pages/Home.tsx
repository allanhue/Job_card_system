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
      const response = await fetch(`${API_URL}/zoho_books/books/analytics/overview`);

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const result = await response.json();

      if (result.success && result.data) {
        setAnalytics(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon, 
    color 
  }: { 
    title: string; 
    value: string | number; 
    change?: string; 
    icon: React.ReactNode; 
    color: string; 
  }) => (
    <div className="group relative overflow-hidden rounded-2xl border border-[#2a2a38] bg-[#1a1a24] p-6 transition-all hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {change && (
            <p className="mt-2 text-sm text-gray-500">{change}</p>
          )}
        </div>
        <div className={`rounded-xl bg-gradient-to-br ${color} p-3 text-white`}>
          {icon}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );

  const StatusChart = () => {
    if (!analytics) return null;

    const statuses = Object.entries(analytics.status_breakdown);
    const total = statuses.reduce((sum, [_, count]) => sum + count, 0);

    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
        case "paid":
          return "from-green-500 to-emerald-600";
        case "overdue":
          return "from-red-500 to-rose-600";
        case "sent":
          return "from-blue-500 to-indigo-600";
        case "draft":
          return "from-gray-500 to-slate-600";
        default:
          return "from-purple-500 to-violet-600";
      }
    };

    return (
      <div className="rounded-2xl border border-[#2a2a38] bg-[#1a1a24] p-6">
        <h3 className="mb-6 text-lg font-semibold text-white">Invoice Status Distribution</h3>
        <div className="space-y-4">
          {statuses.map(([status, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={status}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-gray-300">{status}</span>
                  <span className="text-sm text-gray-400">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#13131a]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${getStatusColor(status)} transition-all duration-500`}
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

  const RecentInvoices = () => {
    if (!analytics?.recent_invoices?.length) return null;

    return (
      <div className="rounded-2xl border border-[#2a2a38] bg-[#1a1a24] p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Invoices</h3>
          <Link 
            href="/invoices"
            className="text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            View All →
          </Link>
        </div>
        <div className="space-y-3">
          {analytics.recent_invoices.map((invoice) => (
            <div
              key={invoice.invoice_id}
              className="flex items-center justify-between rounded-lg border border-[#2a2a38] bg-[#13131a] p-4 transition-all hover:border-indigo-500/30"
            >
              <div className="flex-1">
                <p className="font-medium text-white">{invoice.invoice_number}</p>
                <p className="text-sm text-gray-400">{invoice.customer_name}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-white">
                  {formatCurrency(invoice.total)}
                </p>
                <span
                  className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                    invoice.status === "paid"
                      ? "bg-green-500/20 text-green-400"
                      : invoice.status === "overdue"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const OverdueAlert = () => {
    if (!analytics?.overdue_count || analytics.overdue_count === 0) return null;

    return (
      <div className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-rose-500/10 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-red-500/20 p-3">
            <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-400">Overdue Invoices</h3>
            <p className="mt-1 text-sm text-gray-400">
              You have {analytics.overdue_count} overdue invoice{analytics.overdue_count !== 1 ? "s" : ""} requiring immediate attention
            </p>
            <Link
              href="/invoices?status=overdue"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/30"
            >
              Review Overdue Invoices
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-[#1a1a24]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <p className="font-medium text-red-400">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white">Dashboard</h1>
          <p className="mt-2 text-gray-400">Overview of your job cards and invoices</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(analytics.total_revenue)}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="from-indigo-500 to-purple-600"
          />
          <StatCard
            title="Outstanding"
            value={formatCurrency(analytics.total_outstanding)}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
            color="from-amber-500 to-orange-600"
          />
          <StatCard
            title="Paid Invoices"
            value={analytics.paid_count}
            change={`${analytics.total_invoices} total`}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="from-green-500 to-emerald-600"
          />
          <StatCard
            title="Unpaid"
            value={analytics.unpaid_count}
            change={`${analytics.overdue_count} overdue`}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="from-red-500 to-rose-600"
          />
        </div>

        {/* Overdue Alert */}
        <OverdueAlert />

        {/* Charts and Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <StatusChart />
          <RecentInvoices />
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-[#2a2a38] bg-[#1a1a24] p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">Quick Actions</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/invoices?status=unpaid"
              className="flex items-center gap-4 rounded-xl border border-[#2a2a38] bg-[#13131a] p-4 transition-all hover:border-indigo-500/50"
            >
              <div className="rounded-lg bg-blue-500/20 p-3">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Unpaid Invoices</p>
                <p className="text-sm text-gray-400">View all unpaid</p>
              </div>
            </Link>
            <Link
              href="/invoices?status=overdue"
              className="flex items-center gap-4 rounded-xl border border-[#2a2a38] bg-[#13131a] p-4 transition-all hover:border-red-500/50"
            >
              <div className="rounded-lg bg-red-500/20 p-3">
                <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Overdue</p>
                <p className="text-sm text-gray-400">Needs attention</p>
              </div>
            </Link>
            <Link
              href="/invoices"
              className="flex items-center gap-4 rounded-xl border border-[#2a2a38] bg-[#13131a] p-4 transition-all hover:border-green-500/50"
            >
              <div className="rounded-lg bg-green-500/20 p-3">
                <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">All Invoices</p>
                <p className="text-sm text-gray-400">Browse all</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}