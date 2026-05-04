/**
 * useSwipeGesture
 *
 * Attaches native touch-event listeners to a DOM element ref and fires
 * callbacks for horizontal swipe gestures.
 *
 * - swipeLeft  → archive action (red background)
 * - swipeRight → pin-to-today action (green background)
 *
 * Returns:
 *   - bind: object with onTouchStart/onTouchMove/onTouchEnd to spread on the element
 *   - translateX: current drag offset in px (use for CSS transform)
 *   - swipeState: "idle" | "left" | "right" (shows action hint colour)
 *   - isActive: true while a swipe is in progress
 */

import { useState, useCallback, useRef } from "react";

export type SwipeState = "idle" | "left" | "right";

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum px to trigger a swipe action (default: 80) */
  threshold?: number;
  /** Maximum px to drag before clamping (default: 120) */
  maxDrag?: number;
  /** Disable the hook entirely (e.g. on desktop) */
  disabled?: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  maxDrag = 120,
  disabled = false,
}: SwipeOptions) {
  const startX    = useRef<number | null>(null);
  const startY    = useRef<number | null>(null);
  const isDragging = useRef(false);
  const [translateX, setTranslateX] = useState(0);
  const [swipeState, setSwipeState] = useState<SwipeState>("idle");

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = false;
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || startX.current === null || startY.current === null) return;

    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Cancel horizontal tracking if vertical scroll is dominant
    if (!isDragging.current && Math.abs(dy) > Math.abs(dx) + 5) {
      startX.current = null;
      return;
    }

    if (Math.abs(dx) > 8) {
      isDragging.current = true;
    }

    if (!isDragging.current) return;

    // Prevent page scroll while swiping horizontally
    e.preventDefault();

    // Clamp drag distance with rubber-band feel
    const clamped = Math.sign(dx) * Math.min(Math.abs(dx), maxDrag);
    setTranslateX(clamped);
    setSwipeState(clamped < -threshold / 2 ? "left" : clamped > threshold / 2 ? "right" : "idle");
  }, [disabled, threshold, maxDrag]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || startX.current === null) return;

    if (translateX <= -threshold && onSwipeLeft) {
      // Animate out to the left before firing callback
      setTranslateX(-maxDrag * 1.5);
      setTimeout(() => {
        onSwipeLeft();
        setTranslateX(0);
        setSwipeState("idle");
      }, 180);
    } else if (translateX >= threshold && onSwipeRight) {
      setTranslateX(maxDrag * 1.5);
      setTimeout(() => {
        onSwipeRight();
        setTranslateX(0);
        setSwipeState("idle");
      }, 180);
    } else {
      // Spring back to rest
      setTranslateX(0);
      setSwipeState("idle");
    }

    startX.current = null;
    startY.current = null;
    isDragging.current = false;
  }, [disabled, translateX, threshold, maxDrag, onSwipeLeft, onSwipeRight]);

  const bind = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  return {
    bind,
    translateX,
    swipeState,
    isActive: isDragging.current,
  };
}
