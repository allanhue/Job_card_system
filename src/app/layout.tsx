import "./globals.css";

export const metadata = {
  title: "JobCard Pro",
  description: "Professional Invoice and Job Card Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[var(--background)] text-[var(--foreground)] font-[Inter]">
        {children}
      </body>
    </html>
  );
}
