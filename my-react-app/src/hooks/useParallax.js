import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const useParallax = (speed = 0.5) => {
  const elementRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const element = elementRef.current;
    
    // 计算视差位移
    const yMovement = speed * 100; // 百分比

    triggerRef.current = gsap.to(element, {
      yPercent: yMovement,
      ease: 'none',
      scrollTrigger: {
        trigger: element.parentElement,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    return () => {
      if (triggerRef.current) {
        triggerRef.current.kill();
      }
    };
  }, [speed]);

  return elementRef;
};

export default useParallax;
