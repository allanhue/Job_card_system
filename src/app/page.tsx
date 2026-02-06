"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "./Utils/auth";
import NavBar from "./components/nav_bar";
import Login from "./pages/login";
import PasswordRecovery from "./pages/PasswordRecovery";
import LoadingSpinner from "./components/LoadingSpinner";

const Home = dynamic(() => import("./pages/Home"), { ssr: false });
const InvoiceList = dynamic(() => import("./pages/InvoiceList"), { ssr: false });
const Profile = dynamic(() => import("./pages/Profile"), { ssr: false });
const WorkdriveInvoice = dynamic(() => import("./pages/workdrive_invoice"), { ssr: false });

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 gap-3">
          <LoadingSpinner size={28} />
          Loading...
        </div>
      }
    >
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(
    typeof window !== "undefined" ? localStorage.getItem("page") || "home" : "home"
  );

  const pageParam = searchParams?.get("page");
  const statusParam = searchParams?.get("status") || "all";
  const viewParam = searchParams?.get("view") || "";

  useEffect(() => {
    if (!pageParam) return;
    setCurrentPage(pageParam);
    if (typeof window !== "undefined") {
      localStorage.setItem("page", pageParam);
    }
  }, [pageParam]);

  useEffect(() => {
    if (!user) return;
    if ((pageParam || currentPage) === "home" && !user.is_admin) {
      setCurrentPage("invoices");
      localStorage.setItem("page", "invoices");
      router.push("/?page=invoices");
    }
  }, [user, pageParam, currentPage, router]);

  const handleNavigate = useCallback(
    (page: string) => {
      setCurrentPage(page);
      localStorage.setItem("page", page);
      router.push(`/?page=${page}`);
    },
    [router]
  );

  const effectivePage = pageParam || currentPage;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <LoadingSpinner size={28} />
        Loading...
      </div>
    );
  }

  if (!user && !["login", "forgot", "reset"].includes(effectivePage)) {
    return <Login />;
  }

  return (
    <>
      {user && <NavBar currentPage={currentPage} onNavigate={handleNavigate} />}
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {effectivePage === "home" && <Home />}
        {effectivePage === "invoices" && (
          <InvoiceList initialStatus={statusParam} initialView={viewParam} />
        )}
        {effectivePage === "profile" && <Profile />}
        {effectivePage === "workdrive" && <WorkdriveInvoice />}
        {effectivePage === "login" && <Login />}
        {effectivePage === "forgot" && <PasswordRecovery />}
        {effectivePage === "reset" && <PasswordRecovery />}
      </main>
    </>
  );
}
