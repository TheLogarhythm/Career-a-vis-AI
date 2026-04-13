import React from 'react';
import { motion } from 'framer-motion';
import './TransitionSection.css';

const TransitionSection = ({ 
  title, 
  subtitle, 
  icon = '→',
  theme = 'default' // 'default' | 'data' | 'task' | 'complete'
}) => {
  const themeColors = {
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    data: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
    task: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    complete: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
  };

  return (
    <div 
      className="transition-section"
      style={{ background: themeColors[theme] }}
    >
      <motion.div 
        className="transition-content"
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        viewport={{ once: true, margin: '-100px' }}
      >
        <motion.div 
          className="transition-icon"
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          {icon}
        </motion.div>
        
        <motion.h2 
          className="transition-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          viewport={{ once: true }}
        >
          {title}
        </motion.h2>
        
        <motion.p 
          className="transition-subtitle"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          viewport={{ once: true }}
        >
          {subtitle}
        </motion.p>

        <motion.div 
          className="transition-line"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          viewport={{ once: true }}
        />
      </motion.div>

      {/* 装饰性背景元素 */}
      <div className="transition-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
    </div>
  );
};

export default TransitionSection;
