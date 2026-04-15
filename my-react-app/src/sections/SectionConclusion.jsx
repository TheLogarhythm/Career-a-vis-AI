import React from 'react';
import { motion } from 'framer-motion';
import './SectionConclusion.css';

const TEAM_MEMBERS = [
  { name: 'Labmem 001', role: 'Data Visualization', avatar: '👨‍💻' },
  { name: 'Labmem 002', role: 'Frontend Developer', avatar: '👩‍💻' },
  { name: 'Labmem 003', role: 'Data Analyst', avatar: '🧑‍🔬' },
  { name: 'Labmem 004', role: 'UX Designer', avatar: '🎨' },
];

const SectionConclusion = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="section-conclusion">
      <motion.div 
        className="conclusion-header"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2>Conclusion</h2>
        <p className="conclusion-summary">
          Through our analysis, we've uncovered significant patterns in how AI 
          is transforming the job market across industries and regions.
        </p>
      </motion.div>

      <motion.div 
        className="key-findings"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        viewport={{ once: false }}
      >
        <h3>Key Findings</h3>
        <div className="findings-grid">
          {[
            { icon: '📈', title: 'Growth Trend', desc: 'AI-related job postings increased by 300% over the analysis period' },
            { icon: '💰', title: 'Salary Impact', desc: 'AI-intensive roles command 25% higher salaries on average' },
            { icon: '🌍', title: 'Regional Variations', desc: 'Tech hubs show 2x higher AI adoption than other regions' }
          ].map((finding, index) => (
            <motion.div 
              key={index}
              className="finding-card"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1 * index, duration: 0.6, type: 'spring', stiffness: 100 }}
              viewport={{ once: false }}
              whileHover={{ y: -8, scale: 1.02, boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)' }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.span 
                className="finding-icon"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.5 }}
              >
                {finding.icon}
              </motion.span>
              <h4>{finding.title}</h4>
              <p>{finding.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div 
        className="team-section"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        viewport={{ once: false }}
      >
        <h3>Team Labmem</h3>
        <div className="team-grid">
          {TEAM_MEMBERS.map((member, index) => (
            <motion.div 
              key={index} 
              className="team-card"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1 * index, duration: 0.5 }}
              viewport={{ once: false }}
              whileHover={{ y: -5, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <motion.div 
                className="team-avatar"
                animate={{ 
                  y: [0, -5, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  y: { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 },
                  rotate: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 }
                }}
              >
                {member.avatar}
              </motion.div>
              <h4>{member.name}</h4>
              <p>{member.role}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div 
        className="conclusion-footer"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        viewport={{ once: false }}
      >
        <motion.button 
          className="back-to-top" 
          onClick={scrollToTop}
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          ↑ Back to Top
        </motion.button>
        <p className="credits">
          Data sourced from Kaggle • Built with React + D3.js
        </p>
      </motion.div>
    </div>
  );
};

export default SectionConclusion;
