import "./globals.css";
import { AuthProvider } from "./Utils/auth";
import { ToastProvider } from "./Utils/toast";

export const metadata = {
  title: "JobCard",
  description: "Professional Invoice and Job Card Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[var(--background)] text-[var(--foreground)] font-[Inter]">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
