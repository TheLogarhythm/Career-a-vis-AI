import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./task3-linechart.css";

function Task3_linechart() {
  const chartRef = useRef();
  const isFirstRender = useRef(true); // 1. Track the initial load
  const [overlay, setOverlay] = useState(false);
  const [data, setData] = useState([]);

  const margin = { top: 60, right: 160, bottom: 40, left: 60 };
  const gridW = 420;
  const gridH = 250;
  const fullW = 900;
  const fullH = 500;

  useEffect(() => {
    d3.csv("/ai_impact_jobs_2010_2025.csv").then((raw) => {
      const grouped = d3.rollups(
        raw,
        (v) => ({
          ai_mentioned: d3.mean(v, (d) => (d.ai_mentioned === "True" ? 1 : 0)) * 100,
          salary_usd: d3.mean(v, (d) => +d.salary_usd),
          automation_risk_score: d3.mean(v, (d) => +d.automation_risk_score),
          ai_intensity_score: d3.mean(v, (d) => +d.ai_intensity_score),
        }),
        (d) => +d.posting_year,
      );

      const stats = grouped
        .map(([year, vals]) => ({ posting_year: year, ...vals }))
        .sort((a, b) => a.posting_year - b.posting_year);
      setData(stats);
    });
  }, []);

  useEffect(() => {
    if (data.length === 0) return;

    const container = d3.select(chartRef.current);
    let svg = container.select("svg");
    let tooltip = container.select(".tooltip-div");

    if (tooltip.empty()) {
      tooltip = container
        .append("div")
        .attr("class", "tooltip-div")
        .style("position", "fixed")
        .style("background", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", "10");
    }

    const charts = [
      { key: "ai_mentioned", title: "AI Adoption %", color: "#3498db" },
      { key: "salary_usd", title: "Avg Salary", color: "#27ae60" },
      { key: "automation_risk_score", title: "Risk Score", color: "#e74c3c" },
      { key: "ai_intensity_score", title: "AI Intensity", color: "#9b59b6" },
    ];

    if (svg.empty()) {
      svg = container.append("svg").attr("overflow", "visible");
      charts.forEach((chart, i) => {
        const g = svg.append("g").attr("class", `chart-group group-${i}`);
        g.append("path")
          .attr("class", "line")
          .attr("fill", "none")
          .attr("stroke", chart.color)
          .attr("stroke-width", 2.5);
        g.append("g").attr("class", "x-axis");
        g.append("g").attr("class", "y-axis");
        g.append("text").attr("class", "chart-label").attr("fill", chart.color).style("font-weight", "bold");
      });
    }

    // 2. Set duration to 0 if it's the first time the chart draws, otherwise 1000ms
    const duration = isFirstRender.current ? 0 : 1000;
    const t = d3.transition().duration(duration).ease(d3.easeCubicInOut);

    const width = overlay ? fullW - margin.left - margin.right : gridW - margin.left - 20;
    const height = overlay ? fullH - margin.top - margin.bottom : gridH - margin.top - margin.bottom;

    svg
      .transition(t)
      .attr("width", overlay ? fullW : gridW * 2)
      .attr("height", overlay ? fullH : gridH * 2);

    charts.forEach((chart, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;

      const translateX = overlay ? margin.left : col * (width + margin.left + 30) + margin.left;
      const translateY = overlay ? margin.top : row * gridH + margin.top;

      const g = svg.select(`.group-${i}`);
      g.transition(t).attr("transform", `translate(${translateX}, ${translateY})`);

      const x = d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.posting_year))
        .range([0, width]);
      const maxVal = d3.max(data, (d) => d[chart.key]);
      const y = d3
        .scaleLinear()
        .domain([0, overlay ? 1 : maxVal])
        .range([height, 0]);

      const lineGen = d3
        .line()
        .x((d) => x(d.posting_year))
        .y((d) => y(overlay ? d[chart.key] / maxVal : d[chart.key]))
        .curve(d3.curveMonotoneX);

      g.select(".line").transition(t).attr("d", lineGen(data));

      g.select(".x-axis")
        .attr("transform", `translate(0, ${height})`)
        .transition(t)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));

      g.select(".y-axis")
        .transition(t)
        .style("opacity", overlay ? 0 : 1)
        .call(d3.axisLeft(y).ticks(5));

      g.select(".chart-label")
        .transition(t)
        .attr("x", overlay ? width + 15 : width / 2)
        .attr("y", overlay ? i * 25 : -10)
        .attr("text-anchor", overlay ? "start" : "middle")
        .text(chart.title);

      const circles = g.selectAll(".dot").data(data);

      circles
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("r", 5)
        .attr("fill", chart.color)
        .merge(circles)
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html(`
            <strong>Year: ${d.posting_year}</strong><br/>
            ${chart.title}: ${chart.key === "salary_usd" ? d3.format("$,.0f")(d[chart.key]) : d3.format(".2f")(d[chart.key])}
          `);
        })
        .on("mousemove", (event) => {
          tooltip.style("left", event.clientX + 15 + "px").style("top", event.clientY - 40 + "px");
        })
        .on("mouseout", () => {
          tooltip.transition().duration(300).style("opacity", 0);
        })
        .transition(t)
        .attr("cx", (d) => x(d.posting_year))
        .attr("cy", (d) => y(overlay ? d[chart.key] / maxVal : d[chart.key]));
    });

    // 3. Mark the first render as complete after the logic runs
    isFirstRender.current = false;
  }, [data, overlay]);

  return (
    <div>
      <h2>Changes over Time</h2>
      <button onClick={() => setOverlay(!overlay)} style={{ marginBottom: "20px", padding: "8px 16px" }}>
        {overlay ? "Switch to Grid View" : "Switch to Overlay View"}
      </button>
      <div
        ref={chartRef}
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)",
          padding: "20px",
        }}
      ></div>
    </div>
  );
}

export default Task3_linechart;
