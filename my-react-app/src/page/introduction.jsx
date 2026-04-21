import React, { useState, useEffect, useRef } from "react";
import WordCloud from "wordcloud";
import "./introduction.css";
import aiImpactImage from "../Photo_editing_requirements/Job_Departments_Impact_by_AI_site.jpg";

function Introduction({ scrollParentRef }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const wordCloudCanvasRef = useRef(null);
  const cloudGenerated = useRef(false);

  // 1. 词云生成 (仅生成一次)
  useEffect(() => {
    if (!wordCloudCanvasRef.current || cloudGenerated.current) return;

    const list = [
      ['AI Revolution', 70], ['Future of Work', 65], ['Automation', 60], 
      ['Job Market', 58], ['Worker Impact', 52], ['Augmentation', 50],
      ['Productivity', 48], ['Skills Gap', 45], ['Reskilling', 42],
      ['Digital Shift', 40], ['AI Literacy', 38], ['New Roles', 36],
      ['Innovation', 34], ['Algorithms', 32], ['Wages', 30],
      ['Market Growth', 28], ['Intelligence', 26], ['Human-in-the-loop', 25],
      ['Displacement', 24], ['Strategic', 23], ['Training', 22],
      ['Collaboration', 21], ['Software', 20], ['Analytics', 19]
    ];

    const colors = ['#2563eb', '#7c3aed', '#0891b2', '#4f46e5', '#0f172a', '#1e293b'];

    try {
      WordCloud(wordCloudCanvasRef.current, {
        list: list,
        gridSize: 6,
        weightFactor: 2.5,
        fontFamily: "'Inter', sans-serif",
        color: () => colors[Math.floor(Math.random() * colors.length)],
        rotateRatio: 0.3,
        backgroundColor: 'transparent',
        shrinkToFit: true,
        origin: [400, 200]
      });
      cloudGenerated.current = true;
    } catch (e) {
      console.error("WordCloud failed:", e);
    }
  }, []);

  // 2. 核心滚动处理：将滚动距离映射为 0-300 的进度值
  useEffect(() => {
    const container = scrollParentRef?.current;
    if (!container) return;

    const handleScroll = () => {
      const introSection = container.querySelector('[data-section="intro"]');
      if (!introSection) return;
      
      const scrollPos = container.scrollTop - introSection.offsetTop;
      // 进度范围 0 to 300
      const progress = Math.min(Math.max(scrollPos, 0), 400); 
      setScrollProgress(progress);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollParentRef]);

  // 根据进度计算各层透明度 (Opacity)
  // Stage 0: Text (0-80)
  // Stage 1: WordCloud (100-220)
  // Stage 2: Content (280-400)
  
  const textOpacity = scrollProgress < 60 ? 1 : Math.max(0, 1 - (scrollProgress - 60) / 40);
  
  const cloudOpacity = scrollProgress < 80 ? 0 : 
                       scrollProgress < 140 ? (scrollProgress - 80) / 60 :
                       scrollProgress < 220 ? 1 : 
                       Math.max(0, 1 - (scrollProgress - 220) / 60);

  const contentOpacity = scrollProgress < 260 ? 0 : Math.min(1, (scrollProgress - 260) / 80);

  return (
    <div className="intro-container" data-section="intro">
      <div className="intro-sticky-viewport">
        
        {/* Stage 0: 预导引文字与提示 */}
        <div className="layer stage-text" style={{ opacity: textOpacity, pointerEvents: textOpacity > 0 ? 'auto' : 'none' }}>
           <p className="pre-intro-text">
             Dear job seekers, 
             AI is becoming more and more popular, and this reshapes the job market...
           </p>
           <div className="scroll-hint-minimal">
             <span>Scroll down to explore</span>
             <div className="hint-arrow">↓</div>
           </div>
        </div>

        {/* Stage 1: 词云层 */}
        <div className="layer stage-cloud" style={{ opacity: cloudOpacity, pointerEvents: cloudOpacity > 0 ? 'auto' : 'none' }}>
            <div className="cloud-inner">
              <canvas ref={wordCloudCanvasRef} width="800" height="450" className="intro-cloud-canvas" />
              <div className="cloud-footer">
                  <p className="cloud-source-text">
                    Data insights synthesized from reports by <a href="https://www.pwc.com" target="_blank">PwC</a>, <a href="https://www.bcg.com" target="_blank">BCG</a>, and <a href="https://www.anthropic.com" target="_blank">Anthropic</a>.
                  </p>
                  <p className="cloud-context-text">
                    As AI-related research surges, public attention toward its impact on employment has reached unprecedented levels.
                  </p>
              </div>
            </div>
        </div>

        {/* Stage 2: 详情内容层 */}
        <div className="layer stage-content" style={{ opacity: contentOpacity, pointerEvents: contentOpacity > 0 ? 'auto' : 'none' }}>
            <div className="content-grid">
              <div className="content-left">
                <img src={aiImpactImage} alt="AI Impact" className="intro-main-img" />
              </div>
              <div className="content-right">
                <h2>The AI Revolution in Employment</h2>
                <p>AI's impact on the job market is deeply dual-sided: automation displaces routine roles, yet augments productivity and wages in others.</p>
                <p>This explanatory visualization analyzes how these shifts manifest across different locations and digital adoption stages.</p>
              </div>
            </div>
        </div>

      </div>
    </div>
  );
}

export default Introduction;
