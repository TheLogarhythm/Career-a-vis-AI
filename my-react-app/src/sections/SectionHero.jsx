import React from 'react';
import { motion } from 'framer-motion';
import './SectionHero.css';

const SectionHero = () => {
  return (
    <div className="section-hero">
      <motion.div 
        className="hero-content"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        viewport={{ once: true }}
      >
        <h1 className="hero-title">
          Career-a-Vis AI
        </h1>
        <p className="hero-subtitle">
          Navigate the evolving AI landscape through data-driven narratives
        </p>
        <div className="hero-description">
          <p>
            Explore how artificial intelligence is reshaping industries, 
            salaries, and job markets across the globe. Through interactive 
            visualizations, we uncover the hidden patterns of AI's impact 
            on the workforce from 2010 to 2025.
          </p>
        </div>
      </motion.div>

      <motion.div 
        className="scroll-indicator"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        <div className="mouse-icon">
          <div className="mouse-wheel"></div>
        </div>
        <span>Scroll to explore</span>
      </motion.div>
    </div>
  );
};

export default SectionHero;
