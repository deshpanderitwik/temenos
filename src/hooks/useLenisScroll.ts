import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

export const useLenisScroll = (containerRef: React.RefObject<HTMLDivElement | null>) => {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Lenis for the specific container
    lenisRef.current = new Lenis({
      wrapper: containerRef.current,
      content: containerRef.current,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Ease out exponential
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    // Start the animation loop
    function raf(time: number) {
      lenisRef.current?.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
    };
  }, [containerRef]);

  const scrollToElement = (element: HTMLElement, options?: {
    offset?: number;
    immediate?: boolean;
  }) => {
    if (!lenisRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Calculate the scroll position to bring the element into view
    const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - (options?.offset || 0);
    
    if (options?.immediate) {
      container.scrollTo({
        top: scrollTop,
        behavior: 'auto'
      });
    } else {
      lenisRef.current.scrollTo(scrollTop, {
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      });
    }
  };

  const scrollToBottom = (immediate = false) => {
    if (!lenisRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const scrollTop = container.scrollHeight - container.clientHeight;
    
    if (immediate) {
      container.scrollTo({
        top: scrollTop,
        behavior: 'auto'
      });
    } else {
      lenisRef.current.scrollTo(scrollTop, {
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      });
    }
  };

  return {
    scrollToElement,
    scrollToBottom,
    lenis: lenisRef.current
  };
}; 