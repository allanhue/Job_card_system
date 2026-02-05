"use client";

export default function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-white/60 border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}
