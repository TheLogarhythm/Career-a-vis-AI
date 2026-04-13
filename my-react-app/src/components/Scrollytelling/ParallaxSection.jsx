import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const ParallaxSection = ({ 
  children, 
  backgroundImage, 
  parallaxSpeed = 0.5,
  className = '',
  id
}) => {
  const sectionRef = useRef(null);
  const bgRef = useRef(null);

  useEffect(() => {
    if (!bgRef.current) return;

    // 视差效果：背景以不同速度滚动
    gsap.to(bgRef.current, {
      yPercent: parallaxSpeed * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === sectionRef.current) st.kill();
      });
    };
  }, [parallaxSpeed]);

  return (
    <section 
      ref={sectionRef}
      id={id}
      className={`scrolly-section parallax-section ${className}`}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* 视差背景层 */}
      {backgroundImage && (
        <div
          ref={bgRef}
          className="parallax-bg"
          style={{
            position: 'absolute',
            top: '-20%',
            left: 0,
            width: '100%',
            height: '140%',
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: -1,
          }}
        />
      )}
      
      {/* 内容层 */}
      <div className="section-content" style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </section>
  );
};

export default ParallaxSection;
