"use client";

import { useState, useEffect } from "react";

interface Invoice {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  date: string;
  due_date: string;
  total: number;
  balance: number;
  status: string;
  currency_code: string;
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"styled" | "simple">("styled");

  // Fetch invoices from API
  const fetchInvoices = async (status: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:8000/zoho_books/books/invoices?status=${status}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }

      const result = await response.json();

      if (result.success && result.data?.invoices) {
        setInvoices(result.data.invoices);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(statusFilter);
  }, [statusFilter]);

  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "partially_paid":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Styled View (Tailwind)
  const StyledView = () => (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Invoices</h1>
            <p className="text-gray-600">Manage and view all your invoices</p>
          </div>
          <button
            onClick={() => setViewMode("simple")}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Simple View
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {["all", "sent", "overdue", "paid", "unpaid", "draft"].map((status) => (
              <button
                key={status}
                onClick={() => handleFilterChange(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                  statusFilter === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading invoices...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        )}

        {!loading && !error && invoices.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.invoice_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{invoice.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(invoice.date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(invoice.due_date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(invoice.total, invoice.currency_code)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(invoice.balance, invoice.currency_code)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && invoices.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">No invoices found</h3>
            <p className="mt-2 text-gray-600">Filter: <strong>{statusFilter}</strong></p>
          </div>
        )}
      </div>
    </div>
  );

  // Simple View (Inline Styles)
  const SimpleView = () => (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h1>Invoices</h1>
        <button
          onClick={() => setViewMode("styled")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#e0e0e0",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Styled View
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        {["all", "sent", "overdue", "paid", "unpaid", "draft"].map((status) => (
          <button
            key={status}
            onClick={() => handleFilterChange(status)}
            style={{
              padding: "10px 20px",
              marginRight: "10px",
              marginBottom: "10px",
              backgroundColor: statusFilter === status ? "#007bff" : "#e0e0e0",
              color: statusFilter === status ? "white" : "black",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {loading && <p>Loading invoices...</p>}

      {error && (
        <div style={{ padding: "15px", backgroundColor: "#ffebee", border: "1px solid #f44336", borderRadius: "5px", marginBottom: "20px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && invoices.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Invoice #</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Customer</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Date</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Due Date</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Amount</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Balance</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.invoice_id}>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{invoice.invoice_number}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{invoice.customer_name}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{invoice.date}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{invoice.due_date}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{invoice.currency_code} {invoice.total}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{invoice.currency_code} {invoice.balance}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  <span style={{
                    padding: "5px 10px",
                    borderRadius: "5px",
                    backgroundColor: invoice.status.toLowerCase() === "paid" ? "#4caf50" : invoice.status.toLowerCase() === "overdue" ? "#f44336" : "#2196f3",
                    color: "white",
                    fontSize: "12px",
                  }}>
                    {invoice.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && !error && invoices.length === 0 && (
        <p>No invoices found for: <strong>{statusFilter}</strong></p>
      )}

      {!loading && invoices.length > 0 && (
        <p style={{ marginTop: "20px", fontSize: "14px" }}>
          Showing <strong>{invoices.length}</strong> invoice{invoices.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );

  return viewMode === "styled" ? <StyledView /> : <SimpleView />;
}