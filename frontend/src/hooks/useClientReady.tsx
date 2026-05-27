"use client";

export function useClientReady() {
  return typeof window !== "undefined";
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-6xl items-center justify-center px-4">
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}
