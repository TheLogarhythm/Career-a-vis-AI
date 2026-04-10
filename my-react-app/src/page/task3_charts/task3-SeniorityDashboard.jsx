import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

function IndustryDashboard() {
  const chartRef = useRef();
  const isFirstRender = useRef(true);
  const [overlay, setOverlay] = useState(false);
  const [data, setData] = useState([]);
  
  const [visibleKeys, setVisibleKeys] = useState({
    salary_usd: true,
    ai_intensity_score: true,
    automation_risk_score: true,
    ai_mentioned: true
  });

  // Increased bottom margin for long industry labels
  const margin = { top: 60, right: 180, bottom: 120, left: 70 };
  const gridW = 450, gridH = 340;
  const fullW = 950, fullH = 600;

  const charts = [
    { key: "salary_usd", title: "Avg Salary", color: "#1DD3B0" },
    { key: "ai_intensity_score", title: "AI Intensity", color: "#FF6B6B" },
    { key: "automation_risk_score", title: "Automation Risk", color: "#FF9F1C" },
    { key: "ai_mentioned", title: "AI Mention %", color: "#6A0572" },
  ];

  useEffect(() => {
    if (!overlay) {
      setVisibleKeys({ salary_usd: true, ai_intensity_score: true, automation_risk_score: true, ai_mentioned: true });
    }
  }, [overlay]);

  useEffect(() => {
    d3.csv("/ai_impact_jobs_2010_2025.csv").then((raw) => {
      // 1. Group by 'industry' instead of seniority
      const rolled = d3.rollups(raw, v => ({
        salary_usd: d3.mean(v, d => +d.salary_usd),
        ai_intensity_score: d3.mean(v, d => +d.ai_intensity_score),
        automation_risk_score: d3.mean(v, d => +d.automation_risk_score),
        ai_mentioned: d3.mean(v, d => d.ai_mentioned === "True" ? 1 : 0) * 100,
      }), d => d.industry);

      const keys = charts.map(c => c.key);
      const stats = rolled.map(([industry, values]) => ({ industry, ...values }));

      // Normalize for stacking
      const normalizedStats = stats.map(d => {
        const norm = { ...d };
        keys.forEach(k => norm[`${k}_norm`] = d[k] / (d3.max(stats, s => s[k]) || 1));
        return norm;
      });

      setData(normalizedStats);
    });
  }, []);

  useEffect(() => {
    if (data.length === 0) return;

    const container = d3.select(chartRef.current);
    let svg = container.select("svg");
    
    let tooltip = container.select(".tooltip-div");
    if (tooltip.empty()) {
      tooltip = container.append("div").attr("class", "tooltip-div")
        .style("position", "fixed").style("background", "white").style("border", "1px solid #ccc")
        .style("padding", "8px").style("border-radius", "4px").style("opacity", 0).style("pointer-events", "none").style("z-index", "100");
    }

    if (svg.empty()) {
      svg = container.append("svg").attr("overflow", "visible").style("font-family", "sans-serif");
      charts.forEach((_, i) => {
        const g = svg.append("g").attr("class", `chart-group group-${i}`);
        g.append("g").attr("class", "bars");
        g.append("g").attr("class", "x-axis");
        g.append("g").attr("class", "y-axis");
        g.append("text").attr("class", "chart-label").style("font-weight", "bold").style("cursor", "pointer");
      });
    }

    const duration = isFirstRender.current ? 0 : 800;
    const t = d3.transition().duration(duration).ease(d3.easeCubicInOut);

    const width = overlay ? fullW - margin.left - margin.right : gridW - margin.left - 40;
    const height = overlay ? fullH - margin.top - margin.bottom : gridH - margin.top - margin.bottom;

    const activeKeys = charts.filter(c => visibleKeys[c.key]).map(c => `${c.key}_norm`);
    const stackedData = d3.stack().keys(activeKeys)(data);

    svg.transition(t).attr("width", overlay ? fullW : gridW * 2).attr("height", overlay ? fullH : gridH * 2);

    charts.forEach((chart, i) => {
      const g = svg.select(`.group-${i}`);
      const isVisible = visibleKeys[chart.key];
      const series = stackedData.find(s => s.key === `${chart.key}_norm`);

      // 2. Map domain to 'industry'
      const industries = data.map(d => d.industry);
      const x = d3.scaleBand().domain(industries).range([0, width]).padding(0.3);
      const y = d3.scaleLinear()
        .domain([0, overlay ? d3.max(data, d => activeKeys.reduce((a, k) => a + d[k], 0)) || 1 : d3.max(data, d => d[chart.key]) || 1])
        .range([height, 0]);

      const tx = overlay ? margin.left : (i % 2) * gridW + margin.left;
      const ty = overlay ? margin.top : Math.floor(i / 2) * gridH + margin.top;

      g.transition(t).attr("transform", `translate(${tx}, ${ty})`);

      const bars = g.select(".bars").selectAll(".bar").data(data);

      bars.enter().append("rect").attr("class", "bar")
        .merge(bars)
        .on("mouseover", (event, d) => {
          if (!isVisible) return;
          d3.selectAll(".bar").style("opacity", 0.1);
          d3.select(event.currentTarget).style("opacity", 1);
          tooltip.transition().duration(100).style("opacity", 1);
          const val = chart.key === "salary_usd" ? d3.format("$,.0f")(d[chart.key]) : d3.format(".2f")(d[chart.key]);
          tooltip.html(`<b>${d.industry}</b><br/>${chart.title}: ${val}`);
        })
        .on("mousemove", (event) => {
          tooltip.style("left", (event.clientX + 15) + "px").style("top", (event.clientY - 40) + "px");
        })
        .on("mouseout", () => {
          d3.selectAll(".bar").style("opacity", overlay ? 0.8 : 1);
          tooltip.transition().duration(200).style("opacity", 0);
        })
        .transition(t)
        .attr("x", d => x(d.industry))
        .attr("width", x.bandwidth())
        .attr("fill", chart.color)
        .attr("y", (d, idx) => overlay ? (isVisible && series ? y(series[idx][1]) : height) : y(d[chart.key]))
        .attr("height", (d, idx) => overlay ? (isVisible && series ? y(series[idx][0]) - y(series[idx][1]) : 0) : height - y(d[chart.key]))
        .style("opacity", isVisible ? (overlay ? 0.8 : 1) : (overlay ? 0 : 0.3));

      // 3. Rotate labels to fit long industry names
      g.select(".x-axis")
        .attr("transform", `translate(0, ${height})`)
        .transition(t)
        .style("opacity", overlay && i !== 0 ? 0 : 1)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

      g.select(".y-axis").transition(t).style("opacity", (overlay || !isVisible) ? 0 : 1).call(d3.axisLeft(y).ticks(5));

      g.select(".chart-label")
        .on("click", () => setVisibleKeys(prev => ({ ...prev, [chart.key]: !prev[chart.key] })))
        .transition(t)
        .attr("fill", isVisible ? chart.color : "#9ca3af")
        .attr("x", overlay ? width + 15 : width / 2)
        .attr("y", overlay ? (i * 25) : -15)
        .attr("text-anchor", overlay ? "start" : "middle")
        .text(`${isVisible ? "●" : "○"} ${chart.title}`);
    });

    isFirstRender.current = false;
  }, [data, overlay, visibleKeys]);

  return (
    <div style={{ padding: "40px", backgroundColor: "#f9fafb" }}>
      <button onClick={() => setOverlay(!overlay)} style={{ padding: "10px 20px", cursor: "pointer", marginBottom: "20px" }}>
        {overlay ? "⬅ Back to Grid" : "📊 View Stacked Comparison"}
      </button>
      <div ref={chartRef} style={{ background: "white", borderRadius: "12px", padding: "20px" }}></div>
    </div>
  );
}

export default IndustryDashboard;
