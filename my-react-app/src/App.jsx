import React, { useState } from "react";
import "./App.css";

import Task1 from "./page/task1";
import Task2 from "./page/task2";
import Task3 from "./page/task3";
import Task4 from "./page/task4";
import SummaryStats from "./components/SummaryStats";

function App() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [selectedTask, setSelectedTask] = useState("task1");

  const scrollToTask = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const renderTask = () => {
    switch (selectedTask) {
      case "task1":
        return <Task1 />;
      case "task2":
        return <Task2 />;
      case "task3":
        return <Task3 />;
      case "task4":
        return <Task4 />;
      default:
        return <Task1 />;
    }
  };

  const renderTitle = () => {
    switch (selectedTask) {
      case "task1":
        return "AI Job Global Market";
      case "task2":
        return "AI Impact on Job Market over time";
      case "task3":
        return "Explore different graphs and insights";
      case "task4":
        return "AI Impact on Job Market in the future";
      default:
        return "AI Job Global Market";
    }
  };

  const renderSummary = () => {
    switch (selectedTask) {
      case "task1":
        return "Summary of AI Job Global Market";
      case "task2":
        return "Summary of AI Impact on Job Market over time";
      case "task3":
        return "Chooose different graphs and insights to explore";
      case "task4":
        return "Future predictions of AI Impact on Job Market";
      default:
        return "Summary of AI Job Global Market";
    }
  };

  return (
    <div className="App" style={{ "--drawer-width": drawerOpen ? "280px" : "0px" }}>
      <div className="layout">
        <div className={`drawer ${drawerOpen ? "open" : ""}`}>
          <div className="drawer-content">
            <div className="title">Career-a-Vis AI</div>
            <div className="summary">Navigate the evolving AI landscape through data-driven narratives.</div>
            <button className="nav-btn" onClick={() => scrollToTask("task-1")}>
              1. Regional Globe
            </button>
            <button className="nav-btn" onClick={() => scrollToTask("task-2")}>
              2. Industry Map
            </button>
            <button className="nav-btn" onClick={() => scrollToTask("task-3")}>
              3. Impact Stats
            </button>
            <button className="nav-btn" onClick={() => scrollToTask("task-4")}>
              4. Future Prediction
            </button>
          </div>
          <div className={`drawer ${drawerOpen ? "open" : ""}`}>
            <div className="title">{renderTitle()}</div>
            <div className="summary">{renderSummary()}</div>
            <SummaryStats selectedTask={selectedTask} />

            {/* Navigation Icons Grid */}
            <div className="nav-grid">
              <div
                className={`nav-card ${selectedTask === "task1" ? "active" : ""}`}
                onClick={() => setSelectedTask("task1")}
              >
                <div className="nav-icon">🌍</div>
                <div className="nav-label">Location</div>
              </div>

              <div
                className={`nav-card ${selectedTask === "task2" ? "active" : ""}`}
                onClick={() => setSelectedTask("task2")}
              >
                <div className="nav-icon">📈</div>
                <div className="nav-label">Time</div>
              </div>

              <div
                className={`nav-card ${selectedTask === "task3" ? "active" : ""}`}
                onClick={() => setSelectedTask("task3")}
              >
                <div className="nav-icon">💬</div>
                <div className="nav-label">Topics</div>
              </div>

              <div
                className={`nav-card ${selectedTask === "task4" ? "active" : ""}`}
                onClick={() => setSelectedTask("task4")}
              >
                <div className="nav-icon">🔮</div>
                <div className="nav-label">Prediction</div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="triangle-toggle"
          style={{ left: drawerOpen ? "280px" : "0" }}
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          {drawerOpen ? "◀" : "▶"}
        </div>

        <div className="content">{renderTask()}</div>
      </div>
    </div>
  );
}

export default App;
