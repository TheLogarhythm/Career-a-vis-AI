import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

function SeniorityDashboard() {
  const chartRef = useRef();
  const isFirstRender = useRef(true);
  const [overlay, setOverlay] = useState(false);
  const [data, setData] = useState([]);

  const margin = { top: 60, right: 160, bottom: 80, left: 70 };
  const gridW = 450, gridH = 300;
  const fullW = 900, fullH = 500;

  const seniorityOrder = ['Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Executive'];
  const charts = [
    { key: "salary_usd", title: " Avg Salary", color: "#1DD3B0" },
    { key: "ai_intensity_score", title: " AI Intensity", color: "#FF6B6B" },
    { key: "automation_risk_score", title: " Automation Risk", color: "#FF9F1C" },
    { key: "ai_mentioned", title: " AI Mention %", color: "#6A0572" },
  ];

  useEffect(() => {
    d3.csv("/ai_impact_jobs_2010_2025.csv").then((raw) => {
      const rolled = d3.rollups(raw, v => ({
        salary_usd: d3.mean(v, d => +d.salary_usd),
        ai_intensity_score: d3.mean(v, d => +d.ai_intensity_score),
        automation_risk_score: d3.mean(v, d => +d.automation_risk_score),
        ai_mentioned: d3.mean(v, d => d.ai_mentioned === "True" ? 1 : 0) * 100,
      }), d => d.seniority_level);

      const stats = seniorityOrder.map(level => {
        const match = rolled.find(r => r[0] === level);
        return match ? { level, ...match[1] } : null;
      }).filter(d => d !== null);

      const keys = charts.map(c => c.key);
      const normalizedStats = stats.map(d => {
        const norm = { ...d };
        keys.forEach(k => norm[`${k}_norm`] = d[k] / d3.max(stats, s => s[k]));
        return norm;
      });

      setData(normalizedStats);
    });
  }, []);

  useEffect(() => {
    if (data.length === 0) return;

    const container = d3.select(chartRef.current);
    let svg = container.select("svg");
    
    // 1. Initialize Tooltip Div
    let tooltip = container.select(".tooltip-div");
    if (tooltip.empty()) {
      tooltip = container.append("div")
        .attr("class", "tooltip-div")
        .style("position", "fixed")
        .style("background", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", "10")
        .style("box-shadow", "0 2px 10px rgba(0,0,0,0.1)");
    }

    if (svg.empty()) {
      svg = container.append("svg").attr("overflow", "visible").style("font-family", "sans-serif");
      charts.forEach((chart, i) => {
        const g = svg.append("g").attr("class", `chart-group group-${i}`);
        g.append("g").attr("class", "bars");
        g.append("g").attr("class", "x-axis");
        g.append("g").attr("class", "y-axis");
        g.append("text").attr("class", "chart-label").attr("fill", chart.color).style("font-weight", "bold");
      });
    }

    const duration = isFirstRender.current ? 0 : 1000;
    const t = d3.transition().duration(duration).ease(d3.easeCubicInOut);

    const width = overlay ? fullW - margin.left - margin.right : gridW - margin.left - 40;
    const height = overlay ? fullH - margin.top - margin.bottom : gridH - margin.top - margin.bottom;

    const stackKeys = charts.map(c => `${c.key}_norm`);
    const stackedData = d3.stack().keys(stackKeys)(data);

    svg.transition(t).attr("width", overlay ? fullW : gridW * 2).attr("height", overlay ? fullH : gridH * 2);

    charts.forEach((chart, i) => {
      const g = svg.select(`.group-${i}`);
      const series = stackedData[i]; 

      const x = d3.scaleBand().domain(seniorityOrder).range([0, width]).padding(0.3);
      const y = d3.scaleLinear()
        .domain([0, overlay ? d3.max(data, d => stackKeys.reduce((a, k) => a + d[k], 0)) : d3.max(data, d => d[chart.key])])
        .range([height, 0]);

      const translateX = overlay ? margin.left : (i % 2) * gridW + margin.left;
      const translateY = overlay ? margin.top : Math.floor(i / 2) * gridH + margin.top;

      g.transition(t).attr("transform", `translate(${translateX}, ${translateY})`);

      const bars = g.select(".bars").selectAll(".bar").data(data);

      bars.enter().append("rect").attr("class", "bar")
        .merge(bars)
        // 2. Interaction Events
        .on("mouseover", (event, d) => {
          // Highlight effect: Dim all bars, highlight current
          d3.selectAll(".bar").style("opacity", 0.15);
          d3.select(event.currentTarget).style("opacity", 1);
          
          tooltip.transition().duration(100).style("opacity", 1);
          const val = chart.key === "salary_usd" ? d3.format("$,.0f")(d[chart.key]) : d3.format(".2f")(d[chart.key]);
          tooltip.html(`
            <div style="font-weight:bold">${d.level}</div>
            <div style="color:${chart.color}">${chart.title}: ${val}</div>
          `);
        })
        .on("mousemove", (event) => {
          tooltip.style("left", (event.clientX + 15) + "px")
                 .style("top", (event.clientY - 40) + "px");
        })
        .on("mouseout", () => {
          // Reset highlight
          d3.selectAll(".bar").style("opacity", overlay ? 0.8 : 1);
          tooltip.transition().duration(200).style("opacity", 0);
        })
        .transition(t)
        .attr("x", d => x(d.level))
        .attr("width", x.bandwidth())
        .attr("fill", chart.color)
        .attr("y", (d, idx) => overlay ? y(series[idx][1]) : y(d[chart.key]))
        .attr("height", (d, idx) => overlay ? y(series[idx][0]) - y(series[idx][1]) : height - y(d[chart.key]))
        .style("opacity", overlay ? 0.8 : 1);

      g.select(".x-axis")
        .attr("transform", `translate(0, ${height})`)
        .transition(t)
        .call(d3.axisBottom(x))
        .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");

      g.select(".y-axis").transition(t).style("opacity", overlay ? 0 : 1).call(d3.axisLeft(y).ticks(5));

      g.select(".chart-label")
        .transition(t)
        .attr("x", overlay ? width + 15 : width / 2)
        .attr("y", overlay ? (i * 25) : -15)
        .attr("text-anchor", overlay ? "start" : "middle")
        .text(chart.title);
    });

    isFirstRender.current = false;
  }, [data, overlay]);

  return (
    <div >
      <h2 >Seniority Level Dynamics</h2>
      <button 
        onClick={() => setOverlay(!overlay)} 
        style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #d1d5db", cursor: "pointer", marginBottom: "20px", fontWeight: "bold" }}>
        {overlay ? "⬅ Back to Grid View" : " View Stacked Comparison"}
      </button>
      <div ref={chartRef} style={{ background: "white", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)", padding: "20px" }}></div>
    </div>
  );
}

export default SeniorityDashboard;
