/**
 * InsightHalo Logo — Brain mark + wordmark combination.
 * Uses the official Lucide Brain icon as the single source of truth.
 */

import InsightHaloIcon from "./InsightHaloIcon";
import { cn } from "@/lib/utils";

const textSizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

interface InsightHaloLogoProps {
  variant?: "default" | "header" | "splash" | "auth";
  animated?: boolean;
  showWordmark?: boolean;
  className?: string;
}

export default function InsightHaloLogo({
  variant = "default",
  animated = false,
  showWordmark = true,
  className,
}: InsightHaloLogoProps) {
  const iconSize = variant === "splash" || variant === "auth" ? "xl" : variant === "header" ? "sm" : "md";
  const textSize = variant === "splash" || variant === "auth" ? "xl" : variant === "header" ? "sm" : "md";
  const isAnimated = animated || variant === "splash" || variant === "auth";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        variant === "splash" && "flex-col gap-4",
        variant === "auth" && "flex-col gap-3",
        className
      )}
    >
      <InsightHaloIcon size={iconSize} animated={isAnimated} />
      {showWordmark && (
        <span
          className={cn(
            "font-semibold tracking-tight select-none",
            textSizeMap[textSize],
            variant === "header" && "text-sidebar-accent-foreground",
            (variant === "splash" || variant === "auth") && "text-primary",
            (variant === "default" || !variant) && "text-foreground"
          )}
        >
          InsightHalo
        </span>
      )}
    </div>
  );
}
