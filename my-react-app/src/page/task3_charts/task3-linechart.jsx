import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

function Linechart({ scrollParentRef, selectedIndustry }) {
  const chartRef = useRef();
  const isFirstRender = useRef(true);
  const [overlay, setOverlay] = useState(false);
  const [data, setData] = useState([]);
  const [scrollProgress, setScrollProgress] = useState(0);

  const margin = { top: 60, right: 220, bottom: 40, left: 75 };
  const gridW = 420;
  const gridH = 250;
  const fullW = 950;
  const fullH = 400; 
  const bottomChartY = fullH + 100;

  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    d3.csv(`${baseUrl}ai_impact_jobs_2010_2025.csv`).then((raw) => {
      const filteredRaw = selectedIndustry === "Market Average" 
        ? raw 
        : raw.filter(d => d.industry === selectedIndustry);

      const grouped = d3.rollups(filteredRaw, (v) => {
          const aiJobs = v.filter(d => String(d.ai_mentioned).toLowerCase() === "true");
          const nonAiJobs = v.filter(d => String(d.ai_mentioned).toLowerCase() === "false");
          return {
            ai_mentioned: (aiJobs.length / v.length) * 100,
            salary_usd: d3.mean(v, d => +d.salary_usd), 
            ai_salary_only: d3.mean(aiJobs, d => +d.salary_usd) || 0,
            non_ai_salary: d3.mean(nonAiJobs, d => +d.salary_usd) || 0,
            automation_risk_score: d3.mean(v, d => +d.automation_risk_score),
            ai_intensity_score: d3.mean(v, d => +d.ai_intensity_score),
          };
        }, (d) => +d.posting_year
      );
      setData(grouped.map(([year, vals]) => ({ posting_year: year, ...vals })).sort((a, b) => a.posting_year - b.posting_year));
    });
  }, [selectedIndustry]);

  useEffect(() => {
    const handleScroll = () => {
      if (!overlay || !chartRef.current) return;
      const rect = chartRef.current.getBoundingClientRect();
      const triggerStart = 200; 
      const scrollWindow = 200; 
      const currentScroll = triggerStart - rect.top;
      setScrollProgress(Math.min(1, Math.max(0, currentScroll / scrollWindow)));
    };

    const target = scrollParentRef?.current || window;
    target.addEventListener("scroll", handleScroll);
    return () => target.removeEventListener("scroll", handleScroll);
  }, [overlay, scrollParentRef]);

  useEffect(() => {
    if (data.length === 0) return;

    const container = d3.select(chartRef.current);
    let svg = container.select("svg");
    if (svg.empty()) svg = container.append("svg").attr("overflow", "visible");

    let tooltip = container.select(".tooltip-div");
    if (tooltip.empty()) {
      tooltip = container.append("div").attr("class", "tooltip-div").style("position", "fixed").style("background", "white").style("border", "1px solid #ccc").style("padding", "8px").style("border-radius", "4px").style("pointer-events", "none").style("opacity", 0).style("z-index", "10");
    }

    const charts = [
      { key: "ai_mentioned", title: "AI Adoption %", color: "#3498db", type: "ai" },
      { key: "ai_intensity_score", title: "AI Intensity", color: "#9b59b6", type: "ai" },
      { key: "salary_usd", title: "Avg Salary", color: "#1DD3B0", type: "ai_salary" },
      { key: "automation_risk_score", title: "Risk Score", color: "#e74c3c", type: "ai" },
      ...(overlay ? [{ key: "comparison", title: `Salary Trends: ${selectedIndustry}`, type: "dual" }] : []),
    ];

    const groups = svg.selectAll(".chart-group").data(charts, d => d.key);
    groups.exit().remove();
    const groupsEnter = groups.enter().append("g").attr("class", d => `chart-group group-${d.key}`);
    
    // Add grid group first so it stays behind lines
    groupsEnter.append("g").attr("class", "grid-lines");
    groupsEnter.append("path").attr("class", "line line-main").attr("fill", "none").attr("stroke-width", 3);
    groupsEnter.append("path").attr("class", "line-secondary").attr("fill", "none").attr("stroke-width", 3).style("stroke-dasharray", "4,4");
    groupsEnter.append("g").attr("class", "x-axis");
    groupsEnter.append("g").attr("class", "y-axis");
    groupsEnter.append("text").attr("class", "chart-label").style("font-weight", "bold");

    const allGroups = groupsEnter.merge(groups);
    const t = d3.transition().duration(isFirstRender.current ? 0 : 800).ease(d3.easeCubicInOut);
    const width = overlay ? fullW - margin.left - margin.right : gridW - margin.left - 20;
    const height = overlay ? fullH - margin.top - margin.bottom : gridH - margin.top - margin.bottom;

    svg.transition(t).attr("width", fullW).attr("height", overlay ? fullH * 2 + 300 : gridH * 2 + 100);

    allGroups.each(function (chart, i) {
      const g = d3.select(this);
      const isDual = chart.type === "dual";
      const isAi = overlay && chart.type === "ai";
      const isMove = overlay && chart.type === "ai_salary";

      let targetX, targetY;
      if (overlay) {
        targetX = margin.left;
        targetY = isMove ? d3.interpolateNumber(margin.top, bottomChartY)(scrollProgress) : (isAi ? margin.top : bottomChartY);
      } else {
        const row = Math.floor(i / 2), col = i % 2;
        targetX = col * (width + margin.left + 30) + margin.left;
        targetY = row * gridH + margin.top;
      }
      g.transition(t).attr("transform", `translate(${targetX}, ${targetY})`);

      const x = d3.scaleLinear().domain(d3.extent(data, d => d.posting_year)).range([0, width]);
      const isSalary = chart.key.includes("salary") || isDual || isMove;
      
let y;
if (isSalary) {
  y = d3.scaleLinear().domain([0, 100000]).range([height, 0]);
} else {
  const domainMax = overlay ? 100 : (d3.max(data, d => d[chart.key]) > 1.1 ? 100 : 1);
  y = d3.scaleLinear().domain([0, domainMax]).range([height, 0]);
}


      // --- ADD GRID LINES ---
      const grid = g.select(".grid-lines");
      // Hide grid when AI metrics are stacked in overlay
      const showGrid = !(overlay && (chart.type === "ai" || chart.type === "ai_salary"));
      
      grid.transition(t)
        .style("opacity", showGrid ? 1 : 0)
        .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));
      
      grid.selectAll("line").attr("stroke", "#f0f0f0").attr("stroke-dasharray", "2,2");
      grid.select(".domain").remove();

      g.select(".chart-label")
        .transition(t)
        .attr("x", (overlay && !isDual) ? width + 15 : width / 2)
        .attr("y", (overlay && !isDual) ? i * 25 : -15)
        .attr("fill", isDual ? "#333" : chart.color)
        .attr("text-anchor", (overlay && !isDual) ? "start" : "middle")
        .text(chart.title);

      // Legend Logic
      let legend = g.select(".legend-container");
      if (isDual) {
        if (legend.empty()) legend = g.append("g").attr("class", "legend-container");
        legend.attr("transform", `translate(${width + 15}, 30)`);
        const items = [{ label: "AI Jobs", color: "#bb1dd3", dash: "none" }, { label: "Non-AI", color: "#FF6B6B", dash: "4,4" }];
        const itemJoin = legend.selectAll(".legend-item").data(items);
        itemJoin.exit().remove();
        const itemEnter = itemJoin.enter().append("g").attr("class", "legend-item").attr("transform", (d, idx) => `translate(0, ${idx * 50})`);
        itemEnter.append("line").attr("x1", 0).attr("x2", 20).attr("stroke-width", 3);
        itemEnter.append("text").attr("x", 25).attr("y", 5).style("font-size", "11px").style("font-family", "sans-serif");
        const itemMerge = itemEnter.merge(itemJoin);
        itemMerge.select("line").attr("stroke", d => d.color).style("stroke-dasharray", d => d.dash);
        itemMerge.select("text").text(d => d.label);
      } else { g.select(".legend-container").remove(); }
const lineGenMain = d3.line()
  .x(d => x(d.posting_year))
  .y(d => {
    let val = isDual ? d.ai_salary_only : d[chart.key];
    if (overlay && chart.type === "ai" && val <= 1.1) val *= 100;
    return y(val);
  })
  .curve(d3.curveMonotoneX);

     
      const lineGenSec = d3.line().x(d => x(d.posting_year)).y(d => y(d.non_ai_salary)).curve(d3.curveMonotoneX);

      g.select(".line-main").transition(t).attr("stroke", isDual ? "#bb1dd3" : chart.color).attr("d", lineGenMain(data));
      g.select(".line-secondary").style("opacity", isDual ? 1 : 0).transition(t).attr("stroke", "#FF6B6B").attr("d", isDual ? lineGenSec(data) : null);

      g.select(".x-axis").attr("transform", `translate(0, ${height})`).transition(t).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));
      
const isPrimaryAiChart = overlay && chart.key === "ai_mentioned";

const yAxisOpacity = (overlay && !isPrimaryAiChart && chart.type !== "dual") ? 0 : 1;

g.select(".y-axis")
  .transition(t)
  .style("opacity", yAxisOpacity)
  .call(d3.axisLeft(y)
    .ticks(5)
    .tickFormat(d => {
      if (isSalary) return d3.format("$.2s")(d);
      return overlay ? `${d}%` : d3.format(".1f")(d); 
    })
  );

      // Dots
      const dotsMain = g.selectAll(".dot-main").data(data);
      dotsMain.exit().remove();
      dotsMain.enter().append("circle").attr("class", "dot-main").attr("r", 4).merge(dotsMain)
      .attr("fill", isDual ? "#bb1dd3" : chart.color)   
      .on("mouseover", (e, d) => {
        const rawVal = isDual ? d.ai_salary_only : d[chart.key];
        tooltip.style("opacity", 1)
          .html(`<strong>${d.posting_year}</strong><br/>${chart.title}: ${
            isSalary ? d3.format("$,.0f")(rawVal) : d3.format(".2f")(rawVal)
          }`);
      })

        .on("mousemove", (e) => tooltip.style("left", e.clientX + 15 + "px").style("top", e.clientY - 40 + "px"))
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition(t)
        .attr("cx", d => x(d.posting_year))
        .attr("cy", d => {
          let val = isDual ? d.ai_salary_only : d[chart.key];
          if (overlay && chart.type === "ai" && val <= 1.1) val *= 100;
          return y(val);
        });

      const dotsSec = g.selectAll(".dot-sec").data(isDual ? data : []);
      dotsSec.exit().remove();
      dotsSec.enter().append("circle").attr("class", "dot-sec").attr("r", 4).merge(dotsSec)
        .on("mouseover", (e, d) => {
          tooltip.style("opacity", 1).html(`<strong>${d.posting_year}</strong><br/>Non-AI: ${d3.format("$,.0f")(d.non_ai_salary)}`);
        })
        .on("mousemove", (e) => tooltip.style("left", e.clientX + 15 + "px").style("top", e.clientY - 40 + "px"))
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition(t).attr("fill", "#FF6B6B").attr("cx", d => x(d.posting_year)).attr("cy", d => y(d.non_ai_salary));
    });

    isFirstRender.current = false;
  }, [data, overlay, scrollProgress, selectedIndustry]);

  return (
    <div>
      <div style={{ textAlign: 'center', position: 'sticky', top: '20px', zIndex: 10 }}>
        <button onClick={() => setOverlay(!overlay)} style={{ padding: "10px 20px", cursor: 'pointer', borderRadius: '8px', border: '1px solid #ccc', background: 'white', fontWeight: 'bold' }}>
          {overlay ? "Switch to Grid View" : "Switch to Overlay View"}
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
        <div ref={chartRef} style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }} />
      </div>
    </div>
  );
}

export default Linechart;
