import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const PinnedSection = ({ 
  children, 
  taskId,
  onEnter,
  onLeave,
  className = '' 
}) => {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    // Task进入动画
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=150%',
        pin: true,
        pinSpacing: true,
        onEnter: () => onEnter?.(),
        onLeave: () => onLeave?.(),
      }
    });

    // 3阶段动画：进入 → 展示 → 退出
    tl.fromTo(contentRef.current, 
      { opacity: 0, y: 100, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power2.out' }
    )
    .to({}, { duration: 1 }) // 停留阶段
    .to(contentRef.current, 
      { opacity: 0, y: -50, scale: 0.95, duration: 0.5, ease: 'power2.in' }
    );

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === sectionRef.current) st.kill();
      });
    };
  }, [onEnter, onLeave]);

  return (
    <section 
      ref={sectionRef}
      className={`scrolly-section pinned-section ${className}`}
      style={{ 
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div 
        ref={contentRef}
        className="pinned-content"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </section>
  );
};

export default PinnedSection;
