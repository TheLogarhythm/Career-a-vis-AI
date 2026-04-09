import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./task3.css";
import Task3_linechart from "./task3_charts/task3";

function Task3() {
 
  return (
    <div className="chart-container" style={{ padding: "20px" }}>
      <h2>AI Impact Analysis</h2>
      <Task3_linechart />
    </div>
  );
}

export default Task3;
