"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import InvoiceList from "@/app/pages/InvoiceList";
import NavBar from "@/app/components/nav_bar";
import Login from "@/app/pages/login";
import { useAuth } from "@/app/Utils/auth";

export default function InvoicesPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("page", "invoices");
    }
  }, []);

  const handleNavigate = (page: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("page", page);
    }
    router.push("/");
  };

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <NavBar currentPage="invoices" onNavigate={handleNavigate} />
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <InvoiceList />
      </main>
    </>
  );
}
