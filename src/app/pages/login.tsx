"use client";

import { useState } from "react";
import { useAuth } from "@/app/Utils/auth";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/Utils/toast";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { pushToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const user = await login(email, password);
      pushToast("success", "Login successful. Redirecting...");
      setShowOverlay(true);
      const target = user?.is_admin ? "/?page=home" : "/?page=invoices";
      setTimeout(() => router.push(target), 600);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-100 px-4">
      {showOverlay && (
        <div className="login-overlay">
          <div className="flex flex-col items-center gap-3 text-white">
            <LoadingSpinner size={40} variant="light" />
            <span className="text-sm tracking-wide">Signing you in...</span>
          </div>
        </div>
      )}
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-200 page-fade">
        <div className="mb-6 text-center">
   
          <h2 className="text-2xl font-bold text-slate-900">Sign In</h2>
          <p className="mt-1 text-sm text-slate-500">Welcome  to Job Card</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border border-slate-300 p-3 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border border-slate-300 p-3 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-white font-semibold shadow hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading && <LoadingSpinner size={16} variant="light" />}
            Login
          </button>
          <button
            type="button"
            onClick={() => router.push("/?page=forgot")}
            className="w-full text-sm text-slate-500 hover:text-indigo-600 transition"
          >
            Forgot password?
          </button>
        </form>
      </div>
    </div>
  );
}
