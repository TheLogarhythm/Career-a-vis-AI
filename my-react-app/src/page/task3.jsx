import React from "react";
import "./task3.css";
import Task3_linechart from "./task3_charts/task3-linechart";
import SeniorityDashboard from "./task3_charts/task3-SeniorityDashboard";

function Task3() {
  return (
    <div className="task3-container">
      <div className="task3-content">
        <div className="task3-header">
          <h2>AI Impact Analysis</h2>
          <p>Analyzing AI's impact on jobs across seniority levels and time</p>
        </div>
        <SeniorityDashboard />
        <Task3_linechart />
      </div>
    </div>
  );
}

export default Task3;
