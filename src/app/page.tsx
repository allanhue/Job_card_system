"use client";

import { useState } from "react";
import { useAuth } from "./Utils/auth";
import NavBar from "./components/nav_bar";
import Home from "./pages/Home";
import InvoiceList from "./pages/InvoiceList";
import Profile from "./pages/Profile";
import Login from "./pages/login";

export default function Page() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(
    typeof window !== "undefined" ? localStorage.getItem("page") || "home" : "home"
  );

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    localStorage.setItem("page", page);
  };

  // If user is not logged in, show login page
  if (!user) {
    return <Login />;
  }

  return (
    <>
      <NavBar currentPage={currentPage} onNavigate={handleNavigate} />
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {currentPage === "home" && <Home />}
        {currentPage === "invoices" && <InvoiceList />}
        {currentPage === "profile" && <Profile />}
      </main>
    </>
  );
}
