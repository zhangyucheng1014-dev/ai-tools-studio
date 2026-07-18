import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Button ───────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-[#121512] text-white hover:bg-[#2a302d]",
  secondary: "bg-white/60 text-[#121512] ring-1 ring-black/10 hover:bg-white",
  ghost: "bg-transparent text-[#5b655d] hover:bg-black/5"
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs rounded-lg",
  md: "h-11 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-sm rounded-xl"
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f8b6f]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Card ─────────────────────────────────────────────────────────

export function Card({
  className,
  children
}: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/10 bg-white/78 p-6 shadow-lg backdrop-blur-lg",
        className
      )}
    >
      {children}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────

export function Badge({
  className,
  children
}: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-[#0f8b6f]/10 px-3 py-1 text-xs font-medium text-[#0f8b6f]", className)}>
      {children}
    </span>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-black/5", className)} />
  );
}
