import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollAnimationOptions {
  y?: number;
  x?: number;
  opacity?: number;
  duration?: number;
  stagger?: number;
  delay?: number;
  threshold?: number;
  childSelector?: string;
  scale?: number;
}

export function useScrollAnimation<T extends HTMLElement>(
  options: ScrollAnimationOptions = {}
) {
  const ref = useRef<T>(null);

  const {
    y = 24,
    x = 0,
    opacity = 0,
    duration = 0.6,
    stagger = 0.1,
    delay = 0,
    threshold = 0.15,
    childSelector,
    scale,
  } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = childSelector ? el.querySelectorAll(childSelector) : el;

    const fromVars: gsap.TweenVars = {
      y,
      x,
      opacity,
      duration,
      delay,
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    };

    if (scale !== undefined) {
      fromVars.scale = scale;
    }

    if (childSelector && targets instanceof NodeList && targets.length > 1) {
      fromVars.stagger = stagger;
    }

    const animation = gsap.from(targets, {
      ...fromVars,
      scrollTrigger: {
        trigger: el,
        start: `top ${(1 - threshold) * 100}%`,
        toggleActions: 'play none none none',
      },
    });

    return () => {
      animation.kill();
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [y, x, opacity, duration, stagger, delay, threshold, childSelector, scale]);

  return ref;
}
