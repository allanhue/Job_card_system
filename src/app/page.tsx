"use client";

import { useState } from "react";
import NavBar from "./components/nav_bar";
import Home from "./pages/Home";
import InvoiceList from "./pages/InvoiceList";

export default function Page() {
  const [currentPage, setCurrentPage] = useState(
    typeof window !== "undefined" ? localStorage.getItem("page") || "home" : "home"
  );

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    localStorage.setItem("page", page);
  };


  return (
    <>
      <NavBar currentPage={currentPage} onNavigate={handleNavigate} />
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {currentPage === "home" && <Home />}
        {currentPage === "invoices" && <InvoiceList />}
      </main>
    </>
  );
}
