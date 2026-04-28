import React, { useEffect, useRef, useState } from "react";
import { BookOpen, Globe, Briefcase, MessageCircle, BarChart2, Zap } from "lucide-react";
import Introduction from "./pages/Introduction";
import Task1 from "./pages/Task1";
import TransitionSection from "./components/TransitionSection";
import LeftPanel, { TaskDetail } from "./components/LeftPanel";
import TaskSection from "./components/TaskSection";
import { AiHeatmap, AiJobCount } from "./charts/AiIntensity";
import Radar from "./charts/Radar";
import WeightedBarChart from "./charts/WeightedBarChart";
import LinechartSection from "./charts/LinechartSection";
import { imageUrl } from "./utils/paths";
import "./App.css";

const METRIC_DEFAULTS = {
  salary_usd: 1,
  ai_intensity_score: 1,
  automation_risk_score: 1,
  reskilling_rate: 1,
  displacement_risk: 1,
  skill_complexity: 1,
};

const ACTIVE_METRICS = Object.keys(METRIC_DEFAULTS).reduce(
  (acc, key) => ({ ...acc, [key]: true }),
  {} as Record<string, boolean>,
);

const TASK_DETAILS: Record<string, TaskDetail> = {
  intro: {
    title: (
      <>
        <BookOpen size={18} className="inline-icon" /> Introduction
      </>
    ),
    description:
      "Nowadays, AI's impact on the job market is a hot topic.\n\n" +
      "AI automation risk, job openings, AI exposure, and wage are key factors in this discussion.\n\n" +
      "We are investigating these factors in two datasets to provide an exploratory analysis of AI's impact and a guide for job seekers.\n\n" +
      "Details of the datasets are provided with links below.",
  },
  section1: {
    title: (
      <>
        <Globe size={18} className="inline-icon" /> Location Consideration
      </>
    ),
    description: "In this section, we analyze the geographic distribution of data.",
  },
  section2: {
    title: (
      <>
        <Briefcase size={18} className="inline-icon" /> Across Industries
      </>
    ),
    description: "Analyzing how metrics have shifted over the last decade across different sectors.",
  },
  section3a: {
    title: (
      <>
        <MessageCircle size={18} className="inline-icon" /> How AI automation risk affected
      </>
    ),
    description: "Compare how different industries intersect with regional AI profiles and automation risks.",
  },
  section3b: {
    title: (
      <>
        <BarChart2 size={18} className="inline-icon" /> How AI influences salaries across industries?
      </>
    ),
    description: "Try filtering jobs by AI intensity and see how salary levels differ across industries. ",
  },
  "section3b-2": {
    title: (
      <>
        <BarChart2 size={18} className="inline-icon" /> Job Volume by Category
      </>
    ),
    description:
      "Understanding job volume across categories and subcategories reveals where the demand — and competition — truly lies. This helps career seekers prioritize sectors with the most opportunities.",
  },
  section4: {
    title: (
      <>
        <Zap size={18} className="inline-icon" /> An Evaluation
      </>
    ),
    description: "Forecasting the next 5 years based on current data models.",
  },
};

const BADGE_MAP: Record<string, string[]> = {
  "intro-1": ["AI-Generated_Data.png", "Dataset_Linked.png", "Open_Data.png"],
  "section1-1": ["Can_Mouse_Over.png"],
  "section1-2": ["Can_Mouse_Over.png"],
  section2: ["Aggregated_Data.png", "Data_Normalized.png"],
  section3b: ["Can_Sort_&_Filter.png"],
};

function App() {
  const [activeTask, setActiveTask] = useState("intro");
  const rightContainerRef = useRef<HTMLDivElement | null>(null);
  const [introStage, setIntroStage] = useState(0);
  const [task1Stage, setTask1Stage] = useState(0);
  const [weights, setWeights] = useState<Record<string, number>>({ ...METRIC_DEFAULTS });

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

  if (!TASK_DETAILS[activeTask] && process.env.NODE_ENV === "development") {
    console.warn(`⚠️ No task detail found for: ${activeTask}`);
  }

  let displayDescription = currentDetail.description;

  if (activeTask === "intro") {
    if (introStage === 1) {
      displayDescription = (
        <div>
          <p>
            Jobs are increasingly exposed to AI. The heatmap shows how AI intensity has grown across industries and time
            periods.
          </p>
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
          <p>
            AI adoption across industries has accelerated - and there are signs that AI intensity correlates with higher
            salaries.
          </p>
        </div>
      );
    } else if (introStage >= 3) {
      displayDescription = (
        <div>
          <p>Ready to explore? We'll walk through four key questions to help you navigate the AI-driven job market.</p>
        </div>
      );
    }
  } else if (activeTask === "section1") {
    if (task1Stage === 0) {
      displayDescription =
        "Global 2D map displayed here ro show how AI intensity and salary levels varied across countries in past years and future. Scroll down to see how.";
    } else if (task1Stage === 1) {
      displayDescription = (
        <div>
          <p>
            <b>2010-2025 Historical Phase</b>
          </p>
          <p style={{ marginTop: "6px" }}>
            Easy to see that salary distribution varies significantly across countries in past years. North America and
            Oceania seemsa good choice.
          </p>
          <p style={{ marginTop: "6px" }}>In the aspect of AI intensity, seems the average </p>
          <p style={{ marginTop: "6px", fontStyle: "italic", color: "#64748b", fontSize: "12px" }}>
            Hover a country to see salary breakdown and year-by-year trend.
          </p>
        </div>
      );
    } else if (task1Stage === 2) {
      displayDescription = (
        <div>
          <p>
            <b>2030 Projected Phase</b>
          </p>
          <p style={{ marginTop: "6px" }}>
            Model projections show how salary levels are expected to diverge across economies as AI matures.{" "}
          </p>
          <p style={{ marginTop: "6px" }}>
            Interested thing is that we can actually see that it seems salary may be not so related with the location in
            the future!{" "}
          </p>
          <p style={{ marginTop: "6px" }}>
            Only 8 countries' data is being studied in the dataset as they are somewhat representative.
          </p>
          <p style={{ marginTop: "6px", fontStyle: "italic", color: "#64748b", fontSize: "12px" }}>
            Hover a country to see projected metrics.
          </p>
        </div>
      );
    } else {
      displayDescription = (
        <div>
          <p>
            <b>Current AI index level</b>
          </p>
          <p style={{ marginTop: "6px" }}>
            See how the AI index varies across different countries. This is also important as AI index may potentially
            influence your work in the future.
          </p>
          <p style={{ marginTop: "6px" }}>
            This only shows the current state of AI index, but it is enough to give you an idea.
          </p>
          <p style={{ marginTop: "6px", fontStyle: "italic", color: "#64748b", fontSize: "12px" }}>
            Hover a country to see projected metrics.
          </p>
        </div>
      );
    }
  }

  const leftDescRef = useRef(false);
  const [leftDesc, setLeftDesc] = useState(displayDescription);
  const [leftDescVisible, setLeftDescVisible] = useState(true);

  const descKey =
    activeTask === "intro" ? `intro-${introStage}` : activeTask === "section1" ? `section1-${task1Stage}` : activeTask;

  const badgesToShow = BADGE_MAP[descKey] || BADGE_MAP[activeTask] || [];

  useEffect(() => {
    if (!leftDescRef.current) {
      leftDescRef.current = true;
      setLeftDesc(displayDescription);
      setLeftDescVisible(true);
      return;
    }

    setLeftDescVisible(false);
    const timeout = setTimeout(() => {
      setLeftDesc(displayDescription);
      setLeftDescVisible(true);
    }, 260);
    return () => clearTimeout(timeout);
  }, [descKey, displayDescription]);

  return (
    <div className="web-container">
      <LeftPanel
        currentDetail={currentDetail}
        description={leftDesc}
        descriptionVisible={leftDescVisible}
        badges={badgesToShow}
        showWeights={activeTask === "section3a"}
        weights={weights}
        setWeights={setWeights}
      />

      <div className="right-container" ref={rightContainerRef}>
        <TaskSection task="intro" style={{ paddingBottom: 0, borderBottom: "none" }}>
          <Introduction scrollParentRef={rightContainerRef} onStageChange={setIntroStage} />
        </TaskSection>

        <TransitionSection
          scrollParentRef={rightContainerRef}
          imageSrc={imageUrl("Earth.png")}
          title="Where to work? Regional salary and AI impact. "
          description="Explore how geography influenced salary from 2010 to 2025, and what projections say about the next decade. Also, see how the current AI index varies across countries and what it may mean for your career choices."
        />

        <TaskSection task="section1" style={{ padding: 0 }}>
          <Task1 scrollParentRef={rightContainerRef} onStageChange={setTask1Stage} />
        </TaskSection>

        <TransitionSection
          scrollParentRef={rightContainerRef}
          imageSrc={imageUrl("industries.png")}
          title="Which industry to work in? Industry-level trends and risks. And how AI intensity correlates with salary."
          description="How have different sectors been impacted by AI over the past decade? Let's dive into industry-level trends and see where the opportunities — and risks — lie."
        />

        <TaskSection task="section2">
          <LinechartSection scrollParentRef={rightContainerRef} />
        </TaskSection>

        <TaskSection task="section3b">
          <AiHeatmap />
        </TaskSection>

        <TransitionSection
          scrollParentRef={rightContainerRef}
          imageSrc={imageUrl("Job count.png")}
          title="How many jobs are out there?"
          description="Beyond knowing where the high-paying roles are, it matters how many opportunities each category actually offers. The segmented bar chart below breaks down job listings by category and subcategory, revealing where the volume — and the competition — really is."
        />

        <TaskSection task="section3b-2">
          <AiJobCount />
        </TaskSection>

        <TransitionSection
          scrollParentRef={rightContainerRef}
          imageSrc={imageUrl("Evaluation.png")}
          title="How does AI risk compare across industries?"
          description="Salary and job volume tell one side of the story. But what about automation risk? The radar chart below lets you compare industries across multiple AI-related dimensions — and adjust the weights to see what matters most to you."
        />

        <TaskSection task="section4">
          <Radar scrollParentRef={rightContainerRef} />
        </TaskSection>

        <TaskSection task="section3a">
          <WeightedBarChart weights={weights} activeMetrics={ACTIVE_METRICS} />
        </TaskSection>
      </div>
    </div>
  );
}

export default App;
