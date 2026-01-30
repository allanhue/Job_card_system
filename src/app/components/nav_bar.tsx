"use client";

interface NavBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function NavBar({ currentPage, onNavigate }: NavBarProps) {
  const navItems = [
    { name: "Dashboard", key: "home" },
    { name: "Invoices", key: "invoices" },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-[#e9ecef] bg-white/80 backdrop-blur-md shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]">
            <svg
              className="h-5 w-5 text-white"
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
          <span className="text-base font-semibold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
            JobCard Pro
          </span>
        </div>

        {/* Links */}
        <div className="hidden md:flex gap-6">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`relative text-sm font-medium transition-all ${
                currentPage === item.key
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--foreground-muted)] hover:text-[var(--accent-primary)]"
              }`}
            >
              {item.name}
              {currentPage === item.key && (
                <span className="absolute bottom-0 left-0 right-0 mx-auto h-0.5 w-2/3 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]" />
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
