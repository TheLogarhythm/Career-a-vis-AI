import React, { useState, useEffect, useRef } from "react";
import Task1 from "./page/task1";
import Task2 from "./page/task2";
import AiWordGraph from "./page/task3_charts/ai-keyword";
import Radar from "./page/task3_charts/radar";
import AiIntensity from "./page/task3_charts/ai-intensity";
import LinechartComponent from "./page/task3_charts/linechart";
import Task4 from "./page/task4";
import "./App.css";

const TASK_DETAILS = {
  section1: {
    title: "🌍 Location Analysis",
    description: "In this section, we analyze the geographic distribution of data.",
  },
  section2: {
    title: "📈 Time Trends",
    description: "Analyzing how metrics have shifted over the last decade.",
  },
  section3a: {
    title: "💬 Radar: Industry & Region",
    description: "Compare how different industries intersect with regional AI profiles.",
  },
  section3b: {
    title: "📊 Trend: Historical Analysis",
    description: "Detailed drill-down into historical performance trends.",
  },
  section4: {
    title: "🔮 Predictive Insights",
    description: "Forecasting the next 5 years based on current data models.",
  }
};

function App() {
  const [activeTask, setActiveTask] = useState("section1");
  const rightContainerRef = useRef(null);

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

  const currentDetail = TASK_DETAILS[activeTask] || TASK_DETAILS.section1;

  return (
    <div className="web-container">
      {/* FIXED LEFT SIDE */}
      <div className="left-container">
        <div className="detail-card">
          <span className="badge">Current Stage</span>
          <h2>{currentDetail.title}</h2>
          <p className="description">{currentDetail.description}</p>
        </div>
      </div>

      {/* SCROLLABLE RIGHT SIDE */}
      <div className="right-container" ref={rightContainerRef}>
        <section className="task-section" data-task="section1">
          <Task1 />
        </section>

        <section className="task-section"  data-task="section2">
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
