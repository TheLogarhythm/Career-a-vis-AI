import React, { useEffect } from 'react';
import { ScrollyProvider } from './context/ScrollyContext';
import ScrollyContainer from './components/Scrollytelling/ScrollyContainer';
import ParallaxSection from './components/Scrollytelling/ParallaxSection';
import PinnedSection from './components/Scrollytelling/PinnedSection';
import TransitionSection from './components/Scrollytelling/TransitionSection';
import DraggableRobot from './components/Navigation/DraggableRobot';

// Section组件
import SectionHero from './sections/SectionHero';
import SectionDataset from './sections/SectionDataset';
import SectionTask1 from './sections/SectionTask1';
import SectionTask2 from './sections/SectionTask2';
import SectionTask3 from './sections/SectionTask3';
import SectionTask4 from './sections/SectionTask4';
import SectionConclusion from './sections/SectionConclusion';

// 背景图
import introBg from './photos/intro.jpg';
import task1Bg from './photos/task1.jpg';
import task2Bg from './photos/task2.jpg';
import task3Bg from './photos/task3.jpg';

import './App.css';

function App() {
  return (
    <ScrollyProvider>
      <div className="app-scrolly">
        <ScrollyContainer>
          {/* Section 0: 背景介绍 */}
          <ParallaxSection 
            id="section-0"
            backgroundImage={introBg}
            parallaxSpeed={0.3}
          >
            <SectionHero />
          </ParallaxSection>

          {/* Transition 0→1 */}
          <TransitionSection 
            title="The Dataset"
            subtitle="Exploring 15 years of AI job market data"
            icon="📊"
            theme="data"
          />

          {/* Section 1: 数据集介绍 */}
          <ParallaxSection 
            id="section-1"
            backgroundImage={task1Bg}
            parallaxSpeed={0.4}
          >
            <SectionDataset />
          </ParallaxSection>

          {/* Transition 1→2 */}
          <TransitionSection 
            title="Analysis Tasks"
            subtitle="Four perspectives on AI's impact"
            icon="🔍"
            theme="task"
          />

          {/* Section 2: Task 1 */}
          <PinnedSection 
            id="section-2"
            taskId={0}
          >
            <SectionTask1 />
          </PinnedSection>

          {/* Transition 2→3 */}
          <TransitionSection 
            title="Task 2"
            subtitle="Industry Time Machine"
            icon="⏱️"
            theme="default"
          />

          {/* Section 3: Task 2 (你的部分！) */}
          <PinnedSection 
            id="section-3"
            taskId={1}
          >
            <SectionTask2 />
          </PinnedSection>

          {/* Transition 3→4 */}
          <TransitionSection 
            title="Task 3"
            subtitle="Impact Statistics"
            icon="📈"
            theme="default"
          />

          {/* Section 4: Task 3 */}
          <PinnedSection 
            id="section-4"
            taskId={2}
          >
            <SectionTask3 />
          </PinnedSection>

          {/* Transition 4→5 */}
          <TransitionSection 
            title="Task 4"
            subtitle="Future Predictions"
            icon="🔮"
            theme="default"
          />

          {/* Section 5: Task 4 */}
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

          {/* Section 6: 总结 */}
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
