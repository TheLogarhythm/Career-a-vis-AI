import React, { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useScrolly } from "../../context/ScrollyContext";

gsap.registerPlugin(ScrollTrigger);

const ScrollyContainer = ({ children }) => {
  const containerRef = useRef(null);
  const { setCurrentSection } = useScrolly();

  // 使用 useCallback 防止重复创建
  const updateSection = useCallback((index) => {
    setCurrentSection(index);
  }, [setCurrentSection]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sections = container.querySelectorAll('.scrolly-section');
    const triggers = [];

    // 仅为 pinned sections 创建 ScrollTrigger
    sections.forEach((section, index) => {
      const isPinned = section.classList.contains('pinned-section');

      if (isPinned) {
        // 统一 pinning 逻辑（仅 Task 区域）
        const st = ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: '+=100%', // 标准 100vh 滚动距离
          pin: true,
          pinSpacing: true,
          // 移除 snap，改为自然滚动
          onEnter: () => {
            updateSection(index);
            section.dispatchEvent(new CustomEvent('sectionEnter', {
              detail: { sectionIndex: index }
            }));
          },
          onEnterBack: () => {
            updateSection(index);
            section.dispatchEvent(new CustomEvent('sectionEnter', {
              detail: { sectionIndex: index }
            }));
          },
          onLeave: () => {
            section.dispatchEvent(new CustomEvent('sectionLeave', {
              detail: { sectionIndex: index }
            }));
          },
          onUpdate: (self) => {
            section.dispatchEvent(new CustomEvent('sectionProgress', {
              detail: { progress: self.progress }
            }));
          }
        });
        triggers.push(st);
      } else {
        // 非 pinned sections 只需要状态追踪
        const st = ScrollTrigger.create({
          trigger: section,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => updateSection(index),
          onEnterBack: () => updateSection(index),
        });
        triggers.push(st);
      }
    });

    // 监听滚动结束事件，修复回弹问题
    const handleScrollEnd = () => {
      // 确保 ScrollTrigger 正确刷新
      ScrollTrigger.refresh();
    };

    window.addEventListener('scrollend', handleScrollEnd);

    return () => {
      triggers.forEach(trigger => trigger.kill());
      window.removeEventListener('scrollend', handleScrollEnd);
    };
  }, [updateSection]);

  return (
    <div ref={containerRef} className="scrolly-container">
      {children}
    </div>
  );
};

export default ScrollyContainer;
