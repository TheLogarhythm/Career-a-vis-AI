import React, { useEffect, useState } from "react";
import * as d3 from "d3";

function IndustryIntensityChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    d3.csv("/ai_impact_jobs_2010_2025.csv", d => ({
      industry: d.industry,
      ai_intensity_score: +d.ai_intensity_score
    })).then(rawData => {

        const grouped = d3.rollups(
        rawData,
        v => d3.mean(v, d => d.ai_intensity_score),
        d => d.industry
      ).map(([industry, avgScore]) => ({ industry, avgScore }));

      setData(grouped);
    });
  }, []);

  return (
    <svg width={800} height={500}>
      {data.map((d, i) => (
        <rect
          key={d.industry}
          x={i * 90}
          y={400 - d.avgScore * 400} 
          width={50}
          height={d.avgScore * 400}
          fill="#3b82f6"
        />
      ))}
      {data.map((d, i) => (
        <text
          key={d.industry + "-label"}
          x={i * 90 + 25}
          y={450}
          textAnchor="middle"
          fontSize="10"
        >
          {d.industry}
        </text>
      ))}
    </svg>
  );
}

export default IndustryIntensityChart;