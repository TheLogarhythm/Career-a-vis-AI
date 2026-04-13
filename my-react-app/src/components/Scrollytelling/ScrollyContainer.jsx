import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useScrolly } from "../../context/ScrollyContext";

gsap.registerPlugin(ScrollTrigger);

const ScrollyContainer = ({ children }) => {
  const containerRef = useRef(null);
  const { setCurrentSection } = useScrolly();

  useEffect(() => {
    const sections = containerRef.current.querySelectorAll('.scrolly-section');
    
    // 为每个Section创建ScrollTrigger
    sections.forEach((section, index) => {
      const isPinned = section.classList.contains('pinned-section');
      
      ScrollTrigger.create({
        trigger: section,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => setCurrentSection(index),
        onEnterBack: () => setCurrentSection(index),
      });

      // 软定格配置 (仅Task区域)
      if (isPinned) {
        ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: '+=150%', // 延长滚动距离
          pin: true,
          pinSpacing: true,
          snap: {
            snapTo: [0, 0.5, 1], // 3个吸附点
            duration: { min: 0.3, max: 0.8 },
            ease: 'power2.out',
            // 中点强吸附，两端弱吸附
            onStart: (self) => {
              const progress = self.progress;
              if (progress > 0.3 && progress < 0.7) {
                self.duration(0.8); // 强吸附
              } else {
                self.duration(0.3); // 弱吸附
              }
            }
          }
        });
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [setCurrentSection]);

  return (
    <div ref={containerRef} className="scrolly-container">
      {children}
    </div>
  );
};

export default ScrollyContainer;
