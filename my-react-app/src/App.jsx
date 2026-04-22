import React, { useState, useEffect, useRef } from "react";
import Introduction from "./page/introduction";
import Task1 from "./page/task1";
import Task2 from "./page/task2";
import AiWordGraph from "./page/task3_charts/ai-keyword";
import Radar from "./page/task3_charts/radar";
import AiIntensity from "./page/task3_charts/ai-intensity";
import LinechartComponent from "./page/task3_charts/linechart";
import Task4 from "./page/task4";
import "./App.css";

const TASK_DETAILS = {
  intro: {
    title: "📖 Introduction",
    description: "Nowadays, AI's impact on the job market is a hot topic.\n\n" +
                 "AI automation risk, job openings, AI exposure, and wage are key factors in this discussion.\n\n" +
                 "We are investigating these factors in two datasets to provide an exploratory analysis of AI's impact and a guide for job seekers.\n\n" +
                 "Details of the datasets are provided with links below.",
  },
  section1: {
    title: "🌍 Location Consideration",
    description: "In this section, we analyze the geographic distribution of data.",
  },
  section2: {
    title: "🏭 Across Industries",
    description: "Analyzing how metrics have shifted over the last decade across different sectors.",
  },
  section3a: {
    title: "💬 How AI automation risk affected",
    description: "Compare how different industries intersect with regional AI profiles and automation risks.",
  },
  section3b: {
    title: "📊 Trend: Historical Analysis",
    description: "Detailed drill-down into historical performance trends.",
  },
  section4: {
    title: "🔮 An Evaluation",
    description: "Forecasting the next 5 years based on current data models.",
  }
};

function App() {
  const [activeTask, setActiveTask] = useState("intro");
  const rightContainerRef = useRef(null);
  const [introStage, setIntroStage] = useState(0);

  useEffect(() => {
    const options = {
      root: rightContainerRef.current,
      threshold: 0.3, 
      rootMargin: "0px 0px -40% 0px" 
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveTask(entry.target.getAttribute("data-task"));
        }
      });
    }, options);

    const sections = document.querySelectorAll(".task-section");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const currentDetail = TASK_DETAILS[activeTask] || TASK_DETAILS.intro;

  let displayDescription = currentDetail.description;
  if (activeTask === "intro") {
    if (introStage === 1) {
      displayDescription = (
        <div>
          <p>AI's impact on job market is a heat topic and many people discuss this topic.</p>
          <p style={{ marginTop: "8px" }}>Keywords: <b>Automation Risk, Job Opening, AI Exposure, Wage...</b></p>
        </div>
      );
    } else if (introStage >= 2) {
      displayDescription = (
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

  return (
    <div className="web-container">
      {/* FIXED LEFT SIDE */}
      <div className="left-container">
        <div className="detail-card">
          <span className="badge">Current Stage</span>
          <h2>{currentDetail.title}</h2>
          <div className="description" style={{ whiteSpace: "pre-wrap" }}>
            {displayDescription}
          </div>
        </div>
      </div>

      {/* SCROLLABLE RIGHT SIDE */}
      <div className="right-container" ref={rightContainerRef}>
        
        <section className="task-section" data-task="intro">
          <Introduction scrollParentRef={rightContainerRef} onStageChange={setIntroStage} />
        </section>

        <section className="task-section" data-task="section1">
          <Task1 />
        </section>

        <section className="task-section" data-task="section2">
          <LinechartComponent scrollParentRef={rightContainerRef}/>
        </section>

        <section className="task-section" data-task="section1">
          <AiIntensity />
        </section>
        
        <section className="task-section" data-task="section3a">
          <Radar scrollParentRef={rightContainerRef}/>
        </section>

        <section className="task-section" data-task="section4">
          <Task4 />
        </section>
        
        <div className="bottom-spacer" />
      </div>
    </div>
  );
}

export default App;
