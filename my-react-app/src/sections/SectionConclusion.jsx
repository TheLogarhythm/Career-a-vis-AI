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
        viewport={{ once: true }}
      >
        <h3>Key Findings</h3>
        <div className="findings-grid">
          <div className="finding-card">
            <span className="finding-icon">📈</span>
            <h4>Growth Trend</h4>
            <p>AI-related job postings increased by 300% over the analysis period</p>
          </div>
          <div className="finding-card">
            <span className="finding-icon">💰</span>
            <h4>Salary Impact</h4>
            <p>AI-intensive roles command 25% higher salaries on average</p>
          </div>
          <div className="finding-card">
            <span className="finding-icon">🌍</span>
            <h4>Regional Variations</h4>
            <p>Tech hubs show 2x higher AI adoption than other regions</p>
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="team-section"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        viewport={{ once: true }}
      >
        <h3>Team Labmem</h3>
        <div className="team-grid">
          {TEAM_MEMBERS.map((member, index) => (
            <div key={index} className="team-card">
              <div className="team-avatar">{member.avatar}</div>
              <h4>{member.name}</h4>
              <p>{member.role}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div 
        className="conclusion-footer"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        viewport={{ once: true }}
      >
        <button className="back-to-top" onClick={scrollToTop}>
          ↑ Back to Top
        </button>
        <p className="credits">
          Data sourced from Kaggle • Built with React + D3.js
        </p>
      </motion.div>
    </div>
  );
};

export default SectionConclusion;
