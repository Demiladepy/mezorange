"use client";

import { cn } from "@/lib/cn";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-white/5",
        className,
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-shimmer motion-reduce:animate-none" />
    </div>
  );
}

export function VaultCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/5 bg-glass p-6 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-6 h-10 w-24" />
      <div className="mt-6 flex gap-4">
        <Skeleton className="h-3 flex-1" />
        <Skeleton className="h-3 flex-1" />
        <Skeleton className="h-3 flex-1" />
      </div>
      <Skeleton className="mt-4 h-8 w-full rounded-md" />
    </div>
  );
}
