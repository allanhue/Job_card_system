"use client";

import { useAuth } from "../Utils/auth";
import { useEffect, useRef, useState } from "react";

interface NavBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function NavBar({ currentPage, onNavigate }: NavBarProps) {
  const { user, logout } = useAuth();
  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [userNotifOpen, setUserNotifOpen] = useState(false);
  const [notifToast, setNotifToast] = useState("");
  const prevUnreadRef = useRef(0);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState("");
  const [invoiceOptions, setInvoiceOptions] = useState<
    { id: number; invoice_number: string; client_name: string }[]
  >([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  
  const navItems = [
    ...(user?.is_admin ? [{ name: "Dashboard", key: "home" }] : []),
    { name: "Invoices", key: "invoices" },
    { name: "WorkDrive", key: "workdrive", icon: "folder" },
    { name: "Profile", key: "profile" },
  ];

  const handleLogout = () => {
    logout();
    // The auth context will handle redirect to login
  };

  useEffect(() => {
    if (!showPicker) return;
    const fetchInvoices = async () => {
      setPickerLoading(true);
      setPickerError("");
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/invoices`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load invoices");
        const data = await res.json();
        setInvoiceOptions(
          (data || []).map((inv: any) => ({
            id: inv.id,
            invoice_number: inv.invoice_number,
            client_name: inv.client_name,
          }))
        );
      } catch (err) {
        setPickerError(err instanceof Error ? err.message : "Failed to load invoices");
      } finally {
        setPickerLoading(false);
      }
    };
    fetchInvoices();
  }, [showPicker]);

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const token = localStorage.getItem("token");
        const endpoint = user?.is_admin ? "/notifications?limit=6" : "/notifications/me?limit=6";
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.data) setUserNotifications(data.data);
      } catch {
        setUserNotifications([]);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadUserCount = userNotifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (unreadUserCount > prevUnreadRef.current) {
      const latestUnread = userNotifications.find((n) => !n.read_at);
      if (latestUnread) {
        setNotifToast(latestUnread.title || "New message");
        try {
          const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = 880;
            gain.gain.value = 0.04;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          }
        } catch {
          // noop
        }
        setTimeout(() => setNotifToast(""), 3000);
      }
    }
    prevUnreadRef.current = unreadUserCount;
  }, [unreadUserCount, userNotifications]);

  const handleOpenJob = () => {
    if (!selectedInvoiceId) return;
    onNavigate("invoices");
    const url = `/?page=invoices&openInvoice=${encodeURIComponent(selectedInvoiceId)}`;
    window.location.href = url;
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-[#e9ecef] bg-white/80 backdrop-blur-md shadow-sm page-fade">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
        <div className="flex h-12 sm:h-14 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]">
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5 text-white"
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
            <span className="text-sm sm:text-base font-semibold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
              JobCard Pro
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-4 sm:gap-6">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`relative flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-all py-1 px-2 rounded-md ${
                  currentPage === item.key
                    ? "text-[var(--accent-primary)] bg-orange-50"
                    : "text-[var(--foreground-muted)] hover:text-[var(--accent-primary)] hover:bg-gray-50"
                }`}
              >
                {item.icon === "folder" && (
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
                      d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                    />
                  </svg>
                )}
                {item.name}
                {currentPage === item.key && (
                  <span className="absolute bottom-0 left-0 right-0 mx-auto h-0.5 w-3/4 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]" />
                )}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex gap-2 sm:gap-3 items-center">
            <div className="relative">
              <button
                onClick={() => setUserNotifOpen((prev) => !prev)}
                className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:text-slate-900"
              >
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
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z"
                  />
                </svg>
                {unreadUserCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white">
                    {unreadUserCount}
                  </span>
                )}
              </button>
              {userNotifOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-700">Messages</p>
                    <button
                      onClick={() => setUserNotifOpen(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Close
                    </button>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-auto">
                    {userNotifications.length === 0 && (
                      <p className="text-xs text-slate-500">No messages yet.</p>
                    )}
                    {userNotifications.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => {
                          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/notifications/${note.id}/read`, {
                            method: "POST",
                            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                          });
                          if (note.link) window.location.href = note.link;
                        }}
                        className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                          note.read_at
                            ? "border-slate-200 bg-white text-slate-600"
                            : "border-orange-200 bg-orange-50 text-slate-800"
                        }`}
                      >
                        <p className="font-semibold">{note.title}</p>
                        <p className="text-slate-500">{note.message}</p>
                        {note.created_at && (
                          <span className="mt-1 block text-[10px] text-slate-400">
                            {new Date(note.created_at).toLocaleString()}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="text-xs sm:text-sm text-gray-600">
              {user?.full_name || user?.email}
            </span>
            <button 
              onClick={handleLogout}
              className="text-xs sm:text-sm rounded-lg border border-[#e9ecef] px-2 sm:px-3 py-1.5 sm:py-2 font-medium text-gray-700 transition-all hover:border-red-500/50 hover:text-red-600 hover:bg-gray-50"
            >
              Logout
            </button>
            <button
              onClick={() => setShowPicker(true)}
              className="text-xs sm:text-sm rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-2 sm:px-3 py-1.5 sm:py-2 font-medium text-white transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-md"
            >
              Create Job
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden rounded-lg p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        <div className="md:hidden border-t border-[#e9ecef] bg-white">
          <div className="py-2 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`flex w-full items-center gap-2 text-left px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  currentPage === item.key
                    ? "bg-orange-50 text-orange-600 border-l-4 border-orange-500"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.icon === "folder" && (
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
                      d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                    />
                  </svg>
                )}
                {item.name}
              </button>
            ))}
            <div className="pt-2 border-t border-[#e9ecef]">
              <div className="px-3 py-2 text-sm text-gray-600">
                {user?.full_name || user?.email}
              </div>
              <button 
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
              >
                Logout
              </button>
              <button
                onClick={() => setShowPicker(true)}
                className="block w-full text-left px-3 py-2 text-sm font-medium bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-md mt-1"
              >
                Create Job
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Create Job Card</h3>
                <p className="text-xs text-slate-500">Pick an invoice to start</p>
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              {pickerLoading && <p className="text-xs text-slate-500">Loading invoices...</p>}
              {pickerError && <p className="text-xs text-red-600">{pickerError}</p>}
              {!pickerLoading && !pickerError && (
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50 focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Choose invoice...</option>
                  {invoiceOptions.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} - {inv.client_name}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => setShowPicker(false)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOpenJob}
                  disabled={!selectedInvoiceId}
                  className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 text-xs font-semibold disabled:opacity-50"
                >
                  Open Job Card
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                You can also open an invoice from the invoice list.
              </p>
            </div>
          </div>
        </div>
      )}

      {notifToast && (
        <div className="fixed right-4 top-16 z-50 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg">
          {notifToast}
        </div>
      )}
    </nav>
  );
}
