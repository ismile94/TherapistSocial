import { useState, useEffect, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  enabled?: boolean;
  threshold?: number;
  resistance?: number;
}

interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
}

/**
 * Hook for pull-to-refresh functionality on mobile
 */
export const usePullToRefresh = ({
  onRefresh,
  enabled = true,
  threshold = 80,
  resistance = 2.5
}: UsePullToRefreshOptions): PullToRefreshState & { containerRef: React.RefObject<HTMLDivElement> } => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start if at the top of the scrollable area
      const scrollTop = container.scrollTop || window.scrollY;
      if (scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
        isDraggingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;

      const scrollTop = container.scrollTop || window.scrollY;
      if (scrollTop > 0) {
        isDraggingRef.current = false;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const distance = currentY - startYRef.current;

      if (distance > 0) {
        // Apply resistance - harder to pull the further you go
        const resistanceDistance = distance / resistance;
        const maxDistance = threshold * 1.5;
        const clampedDistance = Math.min(resistanceDistance, maxDistance);
        
        setPullDistance(clampedDistance);
        
        if (distance > threshold) {
          setIsPulling(true);
        } else {
          setIsPulling(false);
        }
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    const handleTouchEnd = async () => {
      if (!isDraggingRef.current) return;

      if (isPulling && pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Pull-to-refresh error:', error);
        } finally {
          setIsRefreshing(false);
        }
      }

      // Reset
      setPullDistance(0);
      setIsPulling(false);
      startYRef.current = 0;
      isDraggingRef.current = false;
    };

    // Only bind touch events if we're on a mobile device or touch-enabled device
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [enabled, isPulling, pullDistance, threshold, resistance, onRefresh]);

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    containerRef
  };
};
