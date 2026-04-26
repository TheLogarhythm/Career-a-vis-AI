import React, { useState, useEffect, useRef } from "react";
import Introduction from "./page/introduction";
import Task1 from "./page/task1";
import Task2 from "./page/task2";
import AiWordGraph from "./page/task3_charts/ai-keyword";
import Radar, { DraggablePie } from "./page/task3_charts/radar"; 
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
  const transitionRef = useRef(null);
  const earthRef = useRef(null);
   const [weights, setWeights] = useState({
    salary_usd: 1,
    ai_intensity_score: 1,
    automation_risk_score: 1,
    reskilling_rate: 1,
    displacement_risk: 1,
    skill_complexity: 1
  });
const [activeMetrics, setActiveMetrics] = useState(
  Object.keys({
    salary_usd: 1, 
    ai_intensity_score: 1, 
    automation_risk_score: 1,
    reskilling_rate: 1, 
    displacement_risk: 1, 
    skill_complexity: 1
  }).reduce((acc, key) => ({ ...acc, [key]: true }), {})
);
  // Intersection observer for active section
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

  // Scroll-driven earth animation: fade in from left → slide right
  useEffect(() => {
  const container = rightContainerRef.current;
  if (!container) return;

  // 缓动函数：让动画启动快、结尾慢，更自然
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const handle = () => {
    const band = transitionRef.current;
    const earth = earthRef.current;
    if (!band || !earth) return;

    const bandRect = band.getBoundingClientRect();
    const viewportH = container.clientHeight;
    const totalTravel = viewportH + bandRect.height;
    const traveled = viewportH - bandRect.top;
    const p = Math.max(0, Math.min(1, traveled / totalTravel));

    let opacity, tx, bgx;
    if (p < 0.3) {
      const t = easeOutCubic(p / 0.3);
      opacity = t;
      tx = 350 * (1 - t); // 从右侧 350px 滑入到 right:0
      bgx = 0;
    } else {
      const t = easeOutCubic((p - 0.3) / 0.7);
      opacity = 1;
      // ✅ 修正：正值向右，负值向左。这里改为向右微调 50px，更贴合“固定在右侧”
      tx = Math.min(t * 50, 50); 
      // 背景平移：根据实际图片宽度调整，避免穿帮
      bgx = t * 30; 
    }

    earth.style.opacity = opacity;
    earth.style.transform = `translateX(${tx}px)`;
    earth.style.backgroundPositionX = `calc(100% - ${bgx}px)`; // 更安全的背景定位写法
  };

  container.addEventListener("scroll", handle, { passive: true });
  handle();
  return () => container.removeEventListener("scroll", handle);
}, []);

  const currentDetail = TASK_DETAILS[activeTask] || TASK_DETAILS.intro;

  if (!TASK_DETAILS[activeTask] && process.env.NODE_ENV === "development") {
    console.warn(`⚠️ No task detail found for: ${activeTask}`);
  }

  let displayDescription = currentDetail.description;

  // Intro state handling
  if (activeTask === "intro") {
    if (introStage === 1) {
      displayDescription = (
        <div>
          <p>Jobs are increasingly exposed to AI. The heatmap shows how AI intensity has grown across industries and time periods.</p>
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
    } else if (introStage === 2) {
      displayDescription = (
        <div>
          <p>AI adoption across industries has accelerated — and there are signs that AI intensity correlates with higher salaries.</p>
        </div>
      );
    } else if (introStage >= 3) {
      displayDescription = (
        <div>
          <p>Ready to explore? We'll walk through four key questions to help you navigate the AI-driven job market.</p>
        </div>
      );
    }
  }
  else if (activeTask === "section1") {
    if (task1Stage === 0) {
      displayDescription = "Global 2D map displayed here ro show how AI intensity and salary levels varied across countries in past years and future. Scroll down to see how.";
    } else if (task1Stage === 1) {
      displayDescription = (
        <div>
          <p><b>2010-2025 Historical Phase</b></p>
          <p style={{marginTop:"6px"}}>Easy to see that salary distribution varies significantly across countries in past years. North America and Oceania seemsa good choice.</p>
          <p style={{marginTop:"6px"}}>In the aspect of AI intensity, seems the average </p>
          <p style={{marginTop:"6px",fontStyle:"italic",color:"#64748b",fontSize:"12px"}}>Hover a country to see salary breakdown and year-by-year trend.</p>
        </div>
      );
    } else if (task1Stage === 2){
      displayDescription = (
        <div>
          <p><b>2030 Projected Phase</b></p>
          <p style={{marginTop:"6px"}}>Model projections show how salary levels are expected to diverge across economies as AI matures. </p>
          <p style={{marginTop:"6px"}}>Interested thing is that we can actually see that it seems salary may be not so related with the location in the future! </p>
          <p style={{marginTop:"6px"}}>Only 8 countries' data is being studied in the dataset as they are somewhat representative.</p>
          <p style={{marginTop:"6px",fontStyle:"italic",color:"#64748b",fontSize:"12px"}}>Hover a country to see projected metrics.</p>
        </div>
      );
    }
    else {
      displayDescription = (
        <div>
          <p><b>Current AI index level</b></p>
          <p style={{marginTop:"6px"}}>See how the AI index varies across different countries. This is also important as AI index may potentially influence your work in the future.</p>
          <p style={{marginTop:"6px"}}>This only shows the current state of AI index, but it is enough to give you an idea.</p>
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
            {activeTask === "section3a" && (
              <div style={{ marginTop: "24px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
                <DraggablePie  weights={weights} 
                  setWeights={setWeights} 
                  activeMetrics={activeMetrics} 
                   />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SCROLLABLE RIGHT SIDE */}
      <div className="right-container" ref={rightContainerRef}>
        
        {/* 新增：STICKY EARTH BACKGROUND - 固定在屏幕底层的地球图层 */}
        <div className="earth-sticky-layer">
          <div className="earth-viewport" ref={earthRef} />
        </div>

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
        <div className="transition-band" ref={transitionRef}>
          <div className="transition-content">
            <h2>First stop: the world map.</h2>
            <p>
              Explore how geography influenced salary and ai intensity from 2010 to 2025, and what projections say about the next decade. 
            </p>
          </div>
          {/* 这里原本的 .earth-viewport 已经被移动到了顶层的 earth-sticky-layer 中 */}
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
          <Radar scrollParentRef={rightContainerRef} weights={weights} />
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

