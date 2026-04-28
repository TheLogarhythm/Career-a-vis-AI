import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const SeniorityDashboard = ({ data, selectedIndustries, colorScale }) => {
  const chartRef = useRef(null);
  const prevSelectionRef = useRef([]); // To track what was already selected

  const width = 500;
  const height = 500;
  const radius = 160;
  const AVG_COLOR = "#94a3b8";

  const metrics = [
    { key: "salary_usd", title: "Avg Salary" },
    { key: "ai_intensity_score", title: "AI Intensity" },
    { key: "automation_risk_score", title: "Automation Risk" },
    { key: "reskilling_rate", title: "Reskilling Demand" },
    { key: "displacement_risk", title: "Displacement Risk" },
    { key: "skill_complexity", title: "Skill Variety" },
  ];

  useEffect(() => {
    if (!data || data.length === 0 || !chartRef.current) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("transform", `translate(${width / 2}, ${height / 2})`);

    const angleSlice = (Math.PI * 2) / metrics.length;
    const rScale = d3.scaleLinear().domain([0, 1]).range([0, radius]);

    // 1. STATIC GRID & AXES (Same as before)
    [0.2, 0.4, 0.6, 0.8, 1.0].forEach((level) => {
      const gridPoints = metrics.map((_, i) => [
        rScale(level) * Math.cos(angleSlice * i - Math.PI / 2),
        rScale(level) * Math.sin(angleSlice * i - Math.PI / 2),
      ]);
      g.append("polygon")
        .attr("points", gridPoints.join(" "))
        .attr("fill", "none")
        .attr("stroke", "#f1f5f9")
        .attr("stroke-width", 1);
    });
    metrics.forEach((m, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", rScale(1) * Math.cos(angle))
        .attr("y2", rScale(1) * Math.sin(angle))
        .attr("stroke", "#f1f5f9");
      g.append("text")
        .attr("x", rScale(1.2) * Math.cos(angle))
        .attr("y", rScale(1.2) * Math.sin(angle))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#94a3b8")
        .style("font-size", "11px")
        .text(m.title);
    });

    // 2. LOGIC TO IDENTIFY THE "NEWLY CLICKED" INDUSTRY
    // If the current list is longer than the previous, the last item in selectedIndustries is the new one.
    const lastAdded =
      selectedIndustries.length > prevSelectionRef.current.length
        ? selectedIndustries[selectedIndustries.length - 1]
        : null;

    // 3. DRAW SHAPES
    selectedIndustries.forEach((name) => {
      const industryData = data.find((d) => d.industry === name);
      if (!industryData) return;

      const isAvg = name === "Market Average";
      const color = isAvg ? AVG_COLOR : colorScale(name);
      const isNew = name === lastAdded; // Check if this industry specifically needs animation

      const radarLine = d3
        .lineRadial()
        .radius((d) => rScale(industryData[`${d.key}_norm`] || 0))
        .angle((d, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);

      const shapeG = g.append("g").style("mix-blend-mode", "multiply");

      // Area Path
      const path = shapeG
        .append("path")
        .datum(metrics)
        .attr("d", radarLine)
        .attr("fill", color)
        .attr("stroke", color)
        .attr("stroke-width", isAvg ? 1 : 2.5)
        .attr("stroke-dasharray", isAvg ? "4,4" : "0");

      if (isNew) {
        path
          .attr("opacity", 0)
          .transition()
          .duration(800)
          .attr("opacity", 1)
          .attr("fill-opacity", isAvg ? 0.1 : 0.35);
      } else {
        path.attr("opacity", 1).attr("fill-opacity", isAvg ? 0.1 : 0.35);
      }

      // Dots
      metrics.forEach((m, i) => {
        const val = industryData[`${m.key}_norm`] || 0;
        const circle = shapeG
          .append("circle")
          .attr("r", isAvg ? 3 : 4.5)
          .attr("cx", rScale(val) * Math.cos(angleSlice * i - Math.PI / 2))
          .attr("cy", rScale(val) * Math.sin(angleSlice * i - Math.PI / 2))
          .attr("fill", color)
          .attr("stroke", "#fff");

        if (isNew) {
          circle.attr("opacity", 0).transition().duration(800).attr("opacity", 1);
        } else {
          circle.attr("opacity", 1);
        }
      });
    });

    // Update the Ref for the next render
    prevSelectionRef.current = [...selectedIndustries];
  }, [data, selectedIndustries, colorScale]);

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
      <div style={{ background: "white", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <svg ref={chartRef} width={width} height={height}></svg>
      </div>
    </div>
  );
};

export default SeniorityDashboard;
