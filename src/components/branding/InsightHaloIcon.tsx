/**
 * InsightHalo Brain Icon — SVG brain mark with optional breathing pulse animation.
 * Used as the core brand symbol throughout the app.
 */

import { cn } from "@/lib/utils";

const sizeMap = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

interface InsightHaloIconProps {
  size?: keyof typeof sizeMap;
  animated?: boolean;
  className?: string;
}

export default function InsightHaloIcon({
  size = "md",
  animated = false,
  className,
}: InsightHaloIconProps) {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Halo glow aura (animated only) */}
      {animated && (
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "animate-[halo-breathe_3s_ease-in-out_infinite]"
          )}
          style={{
            background: "radial-gradient(circle, hsla(187, 80%, 57%, 0.18) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Brain SVG */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          sizeMap[size],
          animated && "animate-[brain-pulse_3s_ease-in-out_infinite]",
          "relative z-10"
        )}
      >
        <defs>
          <linearGradient id="brain-grad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(168, 55%, 45%)" />
            <stop offset="100%" stopColor="hsl(187, 80%, 57%)" />
          </linearGradient>
          {animated && (
            <linearGradient id="brain-grad-glow" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="hsl(168, 55%, 52%)" />
              <stop offset="100%" stopColor="hsl(187, 85%, 65%)" />
            </linearGradient>
          )}
        </defs>
        {/* Brain paths — simplified premium brain mark */}
        <path
          d="M12 2C9.5 2 7.5 3.5 7 5.5C5.5 5.8 4 7.2 4 9C4 10.5 4.8 11.8 6 12.5C5.8 13.2 5.8 14 6 14.8C6.5 16.5 8 17.5 9.5 17.5L10 17.5L10 21C10 21.5 10.5 22 11 22L13 22C13.5 22 14 21.5 14 21L14 17.5L14.5 17.5C16 17.5 17.5 16.5 18 14.8C18.2 14 18.2 13.2 18 12.5C19.2 11.8 20 10.5 20 9C20 7.2 18.5 5.8 17 5.5C16.5 3.5 14.5 2 12 2Z"
          fill="url(#brain-grad)"
          fillOpacity={animated ? undefined : "1"}
          className={animated ? "animate-[brain-fill-pulse_3s_ease-in-out_infinite]" : undefined}
        />
        {/* Neural pathway lines */}
        <path
          d="M12 6L12 10M9 8.5L15 8.5M10 12L14 12M10.5 14.5L13.5 14.5"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.5"
        />
      </svg>
    </div>
  );
}
