"use client";

export function useClientReady() {
  return typeof window !== "undefined";
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-btc-orange/20 border-t-btc-orange motion-safe:animate-spin" />
        <p className="font-heading text-sm text-text-muted">{label}</p>
      </div>
    </div>
  );
}
