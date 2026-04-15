import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

const PinnedSection = ({ 
  children, 
  taskId,
  className = '' 
}) => {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);

  useGSAP(() => {
    const section = sectionRef.current;
    if (!section || !contentRef.current) return;

    // Force opacity to 1 immediately on mount to prevent pale rendering
    gsap.set(contentRef.current, { opacity: 1, y: 0, scale: 1, clearProps: "opacity" });
    
    // Listen for enter events from ScrollyContainer
    const handleEnter = () => {
      gsap.to(contentRef.current, {
        opacity: 1, 
        y: 0, 
        scale: 1, 
        duration: 0.6, 
        ease: 'power2.out'
      });
    };
    
    // Listen for leave events from ScrollyContainer
    const handleLeave = () => {
      gsap.to(contentRef.current, {
        opacity: 0.3, 
        y: -10, 
        scale: 0.98, 
        duration: 0.4, 
        ease: 'power2.in'
      });
    };
    
    section.addEventListener('sectionEnter', handleEnter);
    section.addEventListener('sectionLeave', handleLeave);
    
    return () => {
      section.removeEventListener('sectionEnter', handleEnter);
      section.removeEventListener('sectionLeave', handleLeave);
      gsap.killTweensOf(contentRef.current);
    };
  }, { scope: sectionRef });

  return (
    <section 
      ref={sectionRef}
      className={`scrolly-section pinned-section ${className}`}
      data-task-id={taskId}
    >
      <div 
        ref={contentRef}
        className="pinned-content"
      >
        {children}
      </div>
    </section>
  );
};

export default PinnedSection;
