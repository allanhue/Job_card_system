"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "./Utils/auth";
import NavBar from "./components/nav_bar";
import Login from "./pages/login";
import LoadingSpinner from "./components/LoadingSpinner";

const Home = dynamic(() => import("./pages/Home"), { ssr: false });
const InvoiceList = dynamic(() => import("./pages/InvoiceList"), { ssr: false });
const Profile = dynamic(() => import("./pages/Profile"), { ssr: false });

export default function Page() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(
    typeof window !== "undefined" ? localStorage.getItem("page") || "home" : "home"
  );

  const handleNavigate = useCallback((page: string) => {
    setCurrentPage(page);
    localStorage.setItem("page", page);
  }, []);

  // If user is not logged in, show login page
  if (!user) {
    return <Login />;
  }

  return (
    <>
      <NavBar currentPage={currentPage} onNavigate={handleNavigate} />
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 gap-3">
              <LoadingSpinner size={28} />
              Loading...
            </div>
          }
        >
          {currentPage === "home" && <Home />}
          {currentPage === "invoices" && <InvoiceList />}
          {currentPage === "profile" && <Profile />}
        </Suspense>
      </main>
    </>
  );
}
