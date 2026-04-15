import React from 'react';
import { motion } from 'framer-motion';
import { ScrollyProvider } from './context/ScrollyContext';
import ScrollyContainer from './components/Scrollytelling/ScrollyContainer';
import ParallaxSection from './components/Scrollytelling/ParallaxSection';
import PinnedSection from './components/Scrollytelling/PinnedSection';
import TransitionSection from './components/Scrollytelling/TransitionSection';
import DraggableRobot from './components/Navigation/DraggableRobot';

// Section components
import SectionHero from './sections/SectionHero';
import SectionDataset from './sections/SectionDataset';
import SectionTask1 from './sections/SectionTask1';
import SectionTask2 from './sections/SectionTask2';
import SectionTask3 from './sections/SectionTask3';
import SectionTask4 from './sections/SectionTask4';
import SectionConclusion from './sections/SectionConclusion';

// Background images - removed for cleaner modern gradient backgrounds

import './App.css';
// Narrative Section Component (with animations)
// ============================================
const NarrativeSection = ({ title, subtitle, icon, children, theme = 'light' }) => (
  <motion.section 
    className={`scrolly-section narrative-section narrative-${theme}`}
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    viewport={{ once: false, margin: '-15%', amount: 0.3 }}
  >
    <motion.div 
      className="narrative-content"
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15, duration: 0.7 }}
      viewport={{ once: false }}
    >
      {icon && (
        <motion.div 
          className="narrative-icon"
          initial={{ opacity: 0, rotate: -15, scale: 0.8 }}
          whileInView={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.6, type: 'spring', stiffness: 120 }}
          viewport={{ once: false }}
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
          }}
        >
          {icon}
        </motion.div>
      )}
      {title && (
        <motion.h2 
          className="narrative-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          viewport={{ once: false }}
        >
          {title}
        </motion.h2>
      )}
      {subtitle && (
        <motion.p 
          className="narrative-subtitle"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          viewport={{ once: false }}
        >
          {subtitle}
        </motion.p>
      )}
      {children && (
        <motion.div 
          className="narrative-body"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          viewport={{ once: false }}
        >
          {children}
        </motion.div>
      )}
    </motion.div>
    <motion.div 
      className="narrative-divider"
      initial={{ scaleX: 0, opacity: 0 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      transition={{ delay: 0.55, duration: 0.8, ease: 'easeOut' }}
      viewport={{ once: false }}
    >
      <motion.span 
        className="divider-dot"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
      />
      <span className="divider-line"></span>
      <motion.span 
        className="divider-dot"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />
    </motion.div>
  </motion.section>
);

function App() {
  return (
    <ScrollyProvider>
      <div className="app-scrolly">
        <ScrollyContainer>
          {/* ===== Section 0: Hero / Intro ===== */}
          <ParallaxSection 
            id="section-0"
            parallaxSpeed={0.3}
          >
            <SectionHero />
          </ParallaxSection>

          {/* Narrative: Welcome to the journey */}
          <NarrativeSection 
            title="The Story Begins" 
            subtitle="AI is reshaping every industry. Let's explore how."
            icon="🚀"
            theme="light"
          >
            <p>In the next few minutes, you'll journey through 15 years of data — from 2010 to 2025 — watching AI's impact unfold across industries, salaries, and job markets.</p>
          </NarrativeSection>

          {/* Transition 0→1 */}
          <TransitionSection 
            title="The Dataset"
            subtitle="Exploring 15 years of AI job market data"
            icon="📊"
            theme="data"
          />

          {/* ===== Section 1: Dataset Overview ===== */}
          <ParallaxSection 
            id="section-1"
            parallaxSpeed={0.4}
          >
            <SectionDataset />
          </ParallaxSection>

          {/* Narrative: Transition from data to analysis */}
          <NarrativeSection 
            title="From Data to Insights" 
            subtitle="Four analytical lenses reveal the full picture"
            icon="🔍"
            theme="light"
          >
            <p>Each task explores a different dimension of AI's impact — from geographic distribution to industry-level transformation over time.</p>
          </NarrativeSection>

          {/* Transition 1→2 */}
          <TransitionSection 
            title="Analysis Tasks"
            subtitle="Four perspectives on AI's impact"
            icon="🔍"
            theme="task"
          />

          {/* ===== Section 2: Task 1 ===== */}
          <PinnedSection 
            id="section-2"
            taskId={0}
          >
            <SectionTask1 />
          </PinnedSection>

          {/* Narrative: Between Task 1 and Task 2 */}
          <NarrativeSection 
            title="The Time Machine" 
            subtitle="Watch industries evolve across 15 years"
            icon="⏱️"
            theme="light"
          >
            <p>What if you could watch an entire industry transform in real time? The next visualization lets you scrub through years, comparing how AI intensity and salaries have shifted across Tech, Finance, Healthcare, and more.</p>
          </NarrativeSection>

          {/* Transition 2→3 */}
          <TransitionSection 
            title="Task 2"
            subtitle="Industry Time Machine"
            icon="⏱️"
            theme="default"
          />

          {/* ===== Section 3: Task 2 ===== */}
          <PinnedSection 
            id="section-3"
            taskId={1}
          >
            <SectionTask2 />
          </PinnedSection>

          {/* Narrative: Between Task 2 and Task 3 */}
          <NarrativeSection 
            title="The Numbers Tell a Story" 
            subtitle="Statistical evidence of AI's growing presence"
            icon="📈"
            theme="light"
          >
            <p>Beyond the visualizations, the raw statistics paint a compelling picture. How many jobs mention AI? Which seniority levels are most affected? The next analysis dives deep into the numbers.</p>
          </NarrativeSection>

          {/* Transition 3→4 */}
          <TransitionSection 
            title="Task 3"
            subtitle="Impact Statistics"
            icon="📈"
            theme="default"
          />

          {/* ===== Section 4: Task 3 ===== */}
          <PinnedSection 
            id="section-4"
            taskId={2}
          >
            <SectionTask3 />
          </PinnedSection>

          {/* Narrative: Between Task 3 and Task 4 */}
          <NarrativeSection 
            title="What Lies Ahead?" 
            subtitle="Predicting the future of work in an AI-driven world"
            icon="🔮"
            theme="light"
          >
            <p>With 15 years of historical data as our foundation, we can now project forward. Which industries will see the greatest transformation? What skills will become indispensable?</p>
          </NarrativeSection>

          {/* Transition 4→5 */}
          <TransitionSection 
            title="Task 4"
            subtitle="Future Predictions"
            icon="🔮"
            theme="default"
          />

          {/* ===== Section 5: Task 4 ===== */}
          <PinnedSection 
            id="section-5"
            taskId={3}
          >
            <SectionTask4 />
          </PinnedSection>

          {/* Transition 5→6 */}
          <TransitionSection 
            title="Analysis Complete"
            subtitle="Key findings and conclusions"
            icon="✨"
            theme="complete"
          />

          {/* ===== Section 6: Conclusion ===== */}
          <section id="section-6" className="scrolly-section">
            <SectionConclusion />
          </section>
        </ScrollyContainer>

        <DraggableRobot />
      </div>
    </ScrollyProvider>
  );
}

export default App;
