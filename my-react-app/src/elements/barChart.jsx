import React, { useEffect, useState } from "react";
import * as d3 from "d3";
import "./barChart.css";

function BarChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    d3.csv( "/metrics.csv", d => ({
      label: d.label,
      value: +d.value 
    })).then(setData);
  }, []);

  return (
    <div className="bar-chart">
      <svg width={500} height={300}>
        {data.map((d, i) => (
          <rect
            key={d.label}
            x={i * 90}
            y={300 - d.value * 3}
            width={60}
            height={d.value * 3}
            fill="#3b82f6"
            rx={4}
          />
        ))}
      </svg>
    </div>
  );
}

export default BarChart;