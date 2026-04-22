import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

import Introduction from "./page/introduction";
import Task1 from "./page/task1";
import Task2 from "./page/task2";
import Task3 from "./page/task3";
import Task4 from "./page/task4";

/* ───────────────────────────────────────────
   Section metadata – order matters
   ─────────────────────────────────────────── */
const SECTIONS = [
  { 
    id: "intro", 
    icon: "📖", 
    label: "Intro",       
    title: "Introduction",                            
    summary: "Nowadays, AI's impact on the job market is a hot topic.\n\n" +
         "AI automation risk, job openings, AI exposure, and wage are key factors in this discussion.\n\n" +
         "We are investigating these factors in two datasets to provide an exploratory analysis of AI's impact and a guide for job seekers.\n\n" +
         "We investigate in this 2 dataset and details are provided with link."
             
  },
  { id: "task1", icon: "🌍", label: "Location",    title: "AI Job Global Market",                 summary: "Explore how AI jobs are distributed across countries and regions on an interactive globe." },
  { id: "task2", icon: "📈", label: "Time",        title: "Industry Trends Over Time",            summary: "Compare how different industries have evolved in salary, AI intensity, automation risk and job count." },
  { id: "task3", icon: "💬", label: "Topics",      title: "AI Impact Analysis",                   summary: "Dive into seniority breakdowns and line-chart explorations of the dataset." },
  { id: "task4", icon: "🔮", label: "Prediction",  title: "Future Outlook",                       summary: "Predictive models and forecasts for AI's impact on the job market." },
];

function App() {
  const scrollRef = useRef(null);
  const sectionRefs = useRef({});
  const [activeTask, setActiveTask] = useState("intro");
  const [introStage, setIntroStage] = useState(0);

  const setSectionRef = useCallback((id) => (el) => {
    if (el) sectionRefs.current[id] = el;
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => {
      const scrollTop = container.scrollTop;
      const viewH = container.clientHeight;
      let bestId = SECTIONS[0].id;
      let bestDist = Infinity;
      SECTIONS.forEach(({ id }) => {
        const el = sectionRefs.current[id];
        if (!el) return;
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (top < scrollTop + viewH && bottom > scrollTop) {
          const dist = Math.abs(top - scrollTop);
          if (top <= scrollTop + viewH * 0.4 && dist < bestDist) {
            bestDist = dist;
            bestId = id;
          }
        }
      });
      setActiveTask((prev) => (prev !== bestId ? bestId : prev));
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const active = SECTIONS.find((s) => s.id === activeTask) || SECTIONS[0];

  // 这里的逻辑修复了 displaySummary 未定义的问题
  let displaySummary = active.summary;
  if (active.id === "intro") {
    if (introStage === 1) {
      displaySummary = (
        <div>
          <p>AI's impact on job market is a heat topic and many people discuss this topic.</p>
          <p style={{ marginTop: "8px" }}>Keywords: <b>Automation Risk, Job Opening, AI Exposure, Wage...</b></p>
        </div>
      );
    } else if (introStage >= 2) {
      displaySummary = (
        <div>
          <p>Jobs are much more exposed to AI recently. Investigate the data:</p>
          <div style={{ marginTop: "8px", fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <a href="https://www.kaggle.com/datasets/sahilislam007/ai-impact-on-job-market-20242030/data" target="_blank" rel="noreferrer" style={{color: "#2563eb"}}>Dataset 1: AI Impact (24-30)</a>
            <a href="https://www.kaggle.com/datasets/sarcasmos/ai-society/data" target="_blank" rel="noreferrer" style={{color: "#2563eb"}}>Dataset 2: AI & Society</a>
          </div>
        </div>
      );
    }
  }

  const scrollToSection = (id) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="app-shell">
      <aside className="left-panel">
        <div className="left-panel-header">
          <h1 className="brand-title">Career-a-Vis AI</h1>
          <p className="brand-sub">Navigate the evolving AI landscape</p>
        </div>
        <div className="active-section-card" key={active.id + introStage}>
          <span className="section-icon">{active.icon}</span>
          <h2 className="section-title">{active.title}</h2>
          <div className="section-summary" style={{ fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
            {displaySummary}
          </div>
        </div>
        <nav className="section-nav">
          {SECTIONS.map((s) => (
            <button key={s.id} className={`nav-dot ${s.id === activeTask ? "active" : ""}`} onClick={() => scrollToSection(s.id)}>
              <span className="nav-dot-icon">{s.icon}</span>
              <span className="nav-dot-label">{s.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="right-scroll" ref={scrollRef}>
        <section className="scroll-section" data-section="intro" ref={setSectionRef("intro")}>
          <Introduction scrollParentRef={scrollRef} onStageChange={setIntroStage} />
        </section>
        <section className="scroll-section" data-section="task1" ref={setSectionRef("task1")}><Task1 /></section>
        <section className="scroll-section" data-section="task2" ref={setSectionRef("task2")}><Task2 /></section>
        <section className="scroll-section" data-section="task3" ref={setSectionRef("task3")}><Task3 scrollParentRef={scrollRef} /></section>
        <section className="scroll-section" data-section="task4" ref={setSectionRef("task4")}><Task4 /></section>
      </main>
    </div>
  );
}

export default App;
