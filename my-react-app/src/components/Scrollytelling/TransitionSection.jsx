import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './TransitionSection.css';

const TransitionSection = ({ 
  title, 
  subtitle, 
  icon = '→',
  backgroundImage,
  theme = 'default'
}) => {
  const bgRef = useRef(null);
  const particlesRef = useRef(null);

  const themeColors = {
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    data: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
    task: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    complete: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
  };

  // 为背景图添加视差效果
  useEffect(() => {
    if (!bgRef.current || !backgroundImage) return;
    
    gsap.to(bgRef.current, {
      yPercent: 30,
      ease: 'none',
      scrollTrigger: {
        trigger: '.transition-section',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, [backgroundImage]);

  // 创建粒子动画效果
  useEffect(() => {
    if (!particlesRef.current) return;

    const particles = particlesRef.current.children;
    const tl = gsap.timeline({ repeat: -1, yoyo: false });

    Array.from(particles).forEach((particle, i) => {
      const duration = gsap.utils.random(8, 15);
      const delay = gsap.utils.random(0, 5);
      
      tl.to(particle, {
        y: `random(-100, 100)`,
        x: `random(-50, 50)`,
        rotation: `random(-180, 180)`,
        scale: `random(0.8, 1.2)`,
        opacity: `random(0.3, 0.7)`,
        duration: duration,
        ease: 'sine.inOut',
        delay: delay
      }, 0);
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div 
      className="transition-section"
      style={{ background: themeColors[theme] }}
    >
      {/* 视差背景层 */}
      {backgroundImage && (
        <div 
          ref={bgRef}
          className="transition-parallax-bg"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      
      {/* 粒子效果层 */}
      <div className="transition-particles" ref={particlesRef}>
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="particle" />
        ))}
      </div>
      
      {/* 窗框装饰 */}
      <motion.div 
        className="window-frame"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        viewport={{ once: false, margin: '-10%' }}
      >
        <div className="frame-corner frame-tl" />
        <div className="frame-corner frame-tr" />
        <div className="frame-corner frame-bl" />
        <div className="frame-corner frame-br" />
      </motion.div>
      
      {/* 光晕效果 */}
      <motion.div 
        className="glow-effect"
        animate={{ 
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
      
      {/* 内容层 - 增强动画 */}
      <motion.div 
        className="transition-content"
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.9, 
          ease: [0.16, 1, 0.3, 1] // custom cubic-bezier for smoother motion
        }}
        viewport={{ once: false, margin: '-25%', amount: 0.3 }}
      >
        <motion.div 
          className="transition-icon"
          initial={{ opacity: 0, rotate: -10, scale: 0.8 }}
          whileInView={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.7, type: 'spring', stiffness: 100 }}
          viewport={{ once: false }}
          animate={{ 
            y: [0, -12, 0],
            rotate: [0, 8, -8, 0]
          }}
          transition={{ 
            y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
          }}
        >
          {icon}
        </motion.div>
        
        <motion.h2 
          className="transition-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7, ease: 'easeOut' }}
          viewport={{ once: false }}
        >
          {title}
        </motion.h2>
        
        <motion.p 
          className="transition-subtitle"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: 'easeOut' }}
          viewport={{ once: false }}
        >
          {subtitle}
        </motion.p>

        <motion.div 
          className="transition-line"
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.9, ease: 'easeOut' }}
          viewport={{ once: false }}
        />
      </motion.div>

      {/* 装饰性背景元素（增强版） */}
      <div className="transition-bg-shapes">
        <motion.div 
          className="shape shape-1"
          animate={{ 
            y: [0, -30, 0],
            x: [0, 20, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{ 
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        <motion.div 
          className="shape shape-2"
          animate={{ 
            y: [0, 25, 0],
            x: [0, -25, 0],
            scale: [1, 0.9, 1]
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1
          }}
        />
        <motion.div 
          className="shape shape-3"
          animate={{ 
            y: [0, -20, 0],
            x: [0, -15, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 10,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      </div>
    </div>
  );
};

export default TransitionSection;
