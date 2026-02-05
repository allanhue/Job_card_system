"use client";

export default function LoadingSpinner({
  size = 24,
  variant = "dark",
}: {
  size?: number;
  variant?: "dark" | "light";
}) {
  const color =
    variant === "light"
      ? "border-white/70 border-t-transparent"
      : "border-slate-400 border-t-transparent";

  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 ${color}`}
      style={{ width: size, height: size }}
    />
  );
}
