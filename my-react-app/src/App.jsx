import React, { useState } from "react";
import "./App.css";

import Task1 from "./page/task1"; // Task1 now hosts the main scrollytelling layout for all tasks

function App() {
  const [drawerOpen, setDrawerOpen] = useState(true);

  const scrollToTask = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="App" style={{ "--drawer-width": drawerOpen ? "240px" : "0px" }}>
      <div className="layout">
        <div className={`drawer ${drawerOpen ? "open" : ""}`}>
          <div className="drawer-content">
            <div className="title">Career-a-Vis AI</div>
            <div className="summary">Navigate the evolving AI landscape through data-driven narratives.</div>
            <button className="nav-btn" onClick={() => scrollToTask("task-1")}>1. Regional Globe</button>
            <button className="nav-btn" onClick={() => scrollToTask("task-2")}>2. Industry Map</button>
            <button className="nav-btn" onClick={() => scrollToTask("task-3")}>3. Impact Stats</button>
            <button className="nav-btn" onClick={() => scrollToTask("task-4")}>4. Future Prediction</button>
          </div>
        </div>

        <div
          className="triangle-toggle"
          style={{ left: drawerOpen ? "240px" : "0" }}
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          {drawerOpen ? "◀" : "▶"}
        </div>

        <div className="content">
          <Task1 />
        </div>
      </div>
    </div>
  );
}

export default App;
