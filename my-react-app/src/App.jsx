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
    description:
      "Nowadays, AI's impact on the job market is a hot topic.\n\n" +
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
  },
};

function App() {
  const [activeTask, setActiveTask] = useState("intro");
  const rightContainerRef = useRef(null);
  const [introStage, setIntroStage] = useState(0);
  const [task1Stage, setTask1Stage] = useState(0);

  useEffect(() => {
    const options = {
      root: rightContainerRef.current,
      threshold: 0,
      rootMargin: "-45% 0px -45% 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const task = entry.target.getAttribute("data-task");
          if (task) setActiveTask(task);
        }
      });
    }, options);

    const sections = document.querySelectorAll(".task-section");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const currentDetail = TASK_DETAILS[activeTask] || TASK_DETAILS.intro;

  // 调试用：如果 activeTask 没有匹配到配置，输出警告
  if (!TASK_DETAILS[activeTask] && process.env.NODE_ENV === "development") {
    console.warn(`⚠️ No task detail found for: ${activeTask}`);
  }

  let displayDescription = currentDetail.description;

  // Intro state handling
  if (activeTask === "intro") {
    if (introStage === 1) {
      displayDescription = (
        <div>
          <p>AI's impact on job market is a hot topic and many people discuss this topic.</p>
          <p style={{ marginTop: "8px" }}>
            Keywords: <b>Automation Risk, Job Opening, AI Exposure, Wage...</b>
          </p>
        </div>
      );
    } else if (introStage >= 2) {
      displayDescription = (
        <div>
          <p>Jobs are much more exposed to AI recently. Investigate the data:</p>
          <div
            style={{
              marginTop: "8px",
              fontSize: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <a
              href="https://www.kaggle.com/datasets/sarcasmos/ai-society/data"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2563eb" }}
            >
              Dataset 1: Global AI Impact on Jobs (2010-2025)
            </a>
            <a
              href="https://www.kaggle.com/datasets/sahilislam007/ai-impact-on-job-market-20242030/data"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2563eb" }}
            >
              Dataset 2: AI Impact on Job Market (2024-2030)
            </a>
          </div>
        </div>
      );
    }
  }
  // �?Section1 部分 - 使用 task1Stage 而非 introStage
  else if (activeTask === "section1") {
    if (task1Stage === 0) {
      displayDescription = "10 major tech economies mapped. Scroll down to reveal how AI investment and automation reshaped the global job market.";
    } else if (task1Stage === 1) {
      displayDescription = (
        <div>
          <p><b>2000-2025 Historical Phase</b></p>
          <p style={{marginTop:"6px"}}>Avg salary = mean of AI Engineer, Data Scientist, and ML Engineer salaries. Colors reveal which economies led in compensation and automation during this era.</p>
          <p style={{marginTop:"6px",fontStyle:"italic",color:"#64748b",fontSize:"12px"}}>Hover a country to see salary breakdown and year-by-year trend.</p>
        </div>
      );
    } else {
      displayDescription = (
        <div>
          <p><b>2026-2036 Projected Phase</b></p>
          <p style={{marginTop:"6px"}}>Model projections show how automation intensity and salary levels are expected to diverge across economies as AI matures.</p>
          <p style={{marginTop:"6px",fontStyle:"italic",color:"#64748b",fontSize:"12px"}}>Hover a country to see projected metrics.</p>
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
        {/* Intro Section */}
        <section
          className="task-section"
          data-task="intro"
          style={{ paddingBottom: 0, borderBottom: "none" }}
        >
          <Introduction
            scrollParentRef={rightContainerRef}
            onStageChange={setIntroStage}
          />
        </section>

        {/* Transition Banner */}
        <div className="transition-band">
          <h2>How does this impact look globally?</h2>
          <p>
            We mapped out the AI job distributions to see which regions are
            leading the revolution.
          </p>
        </div>

        {/* Task1 - Location */}
        <section className="task-section" data-task="section1" style={{ padding: 0 }}>
          <Task1
            scrollParentRef={rightContainerRef}
            onStageChange={setTask1Stage}
          />
        </section>

        {/* Task2 - Line Chart (Industries) */}
        <section className="task-section" data-task="section2">
          <LinechartComponent scrollParentRef={rightContainerRef} />
        </section>

        {/* AiIntensity - Trend Analysis (section3b) */}
        <section className="task-section" data-task="section3b">
          <AiIntensity />
        </section>

        {/* Radar - AI Risk Comparison (section3a) */}
        <section className="task-section" data-task="section3a">
          <Radar scrollParentRef={rightContainerRef} />
        </section>

        {/* Task4 - Evaluation */}
        <section className="task-section" data-task="section4">
          <Task4 />
        </section>

        {/* Bottom Spacer for smooth scroll ending */}
        <div className="bottom-spacer" />
      </div>
    </div>
  );
}

export default App;
