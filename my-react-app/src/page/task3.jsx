import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./task3.css";
import Linechart from "./task3_charts/task3-linechart";
import SeniorityDashboard from "./task3_charts/task3-SeniorityDashboard";

function Task3() {
  return (
    <div>
      {" "}
      <h2>AI Impact Analysis</h2>
      <SeniorityDashboard />
      <Linechart />
    </div>
  );
}

export default Task3;
