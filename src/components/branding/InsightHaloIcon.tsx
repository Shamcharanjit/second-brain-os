/**
 * InsightHalo Brain Icon — wraps the official Lucide Brain icon
 * with optional breathing pulse animation and brand color treatment.
 * This is the single source of truth for the InsightHalo brain mark.
 */

import { Brain } from "lucide-react";
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
          className="absolute inset-0 rounded-full animate-[halo-breathe_3s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, hsl(var(--brain-teal) / 0.18) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Official Lucide Brain icon — the exact existing InsightHalo mark */}
      <Brain
        className={cn(
          sizeMap[size],
          "text-primary relative z-10",
          animated && "animate-[brain-pulse_3s_ease-in-out_infinite]"
        )}
      />
    </div>
  );
}
