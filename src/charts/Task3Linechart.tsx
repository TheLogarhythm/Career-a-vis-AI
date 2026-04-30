import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { dbUrl } from "../utils/paths";








function Task3Linechart({ scrollParentRef, selectedIndustry, comparisonIndustry, onOverlayChange }) {
  const chartRef = useRef();
  const isFirstRender = useRef(true);
  const [overlay, setOverlay] = useState(false);
  const [data, setData] = useState([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollRequestRef = useRef(null);
  const lastScrollTop = useRef(0);

useEffect(() => {
    if (onOverlayChange) {
      onOverlayChange(overlay);
    }
  }, [overlay, onOverlayChange]);






  const margin = { top: 60, right: 220, bottom: 40, left: 75 };
  const gridW = 420;
  const gridH = 250;
  const fullW = 950;
  const fullH = 400;
  const bottomChartY = fullH + 100;








  useEffect(() => {
    d3.csv(dbUrl("ai_impact_jobs_2010_2025.csv")).then((raw) => {

      const process = (ind) => {
        const filtered = ind === "Market Average" ? raw : raw.filter(d => d.industry === ind);
        return d3.rollups(filtered, v => {
          // Separate AI and Non-AI groups to get specific averages
          const aiJobs = v.filter(d => String(d.ai_mentioned).toLowerCase() === "true");
          const nonAiJobs = v.filter(d => String(d.ai_mentioned).toLowerCase() === "false");

          return {
            ai_mentioned: (aiJobs.length / v.length) * 100,
            salary_usd: d3.mean(v, d => +d.salary_usd),
            // Add these two lines to separate the salary data
            ai_salary_only: d3.mean(aiJobs, d => +d.salary_usd) || 0,
            non_ai_salary: d3.mean(nonAiJobs, d => +d.salary_usd) || 0,
            ai_intensity_score: d3.mean(v, d => +d.ai_intensity_score),
            automation_risk_score: d3.mean(v, d => +d.automation_risk_score),
          };
        }, d => +d.posting_year);
      };

      const mainGrouped = process(selectedIndustry);
      const compGrouped = comparisonIndustry !== "None" ? process(comparisonIndustry) : [];

      const combined = mainGrouped.map(([year, vals]) => {
        const c = compGrouped.find(([y]) => y === year);
        return {
          posting_year: year,
          ...vals,
          // Store comparison values with a prefix
          comp_ai_mentioned: c ? c[1].ai_mentioned : null,
          comp_salary_usd: c ? c[1].salary_usd : null,
          comp_ai_intensity_score: c ? c[1].ai_intensity_score : null,
          comp_automation_risk_score: c ? c[1].automation_risk_score : null,
        };
      });

      setData(combined.sort((a, b) => a.posting_year - b.posting_year));
    });
  }, [selectedIndustry, comparisonIndustry]);



useEffect(() => {
  const handleScroll = () => {
    if (!chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();
    const triggerPoint = 20; // This should match your trigger condition

    if (!overlay && rect.top <= triggerPoint) {
      setOverlay(true);
    }
    if (overlay && rect.top > 70) {
      setOverlay(false);
      setScrollProgress(0); // Reset progress when going back to grid
    }

    if (overlay) {
      const distanceScrolled = triggerPoint - rect.top;
      
      const currentProgress = Math.max(0, distanceScrolled) / 400; 
      
      setScrollProgress(Math.min(1, currentProgress));
    }
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
      { key: "ai_mentioned", title: "AI Adoption %", color: "#3498db", type: "ai" },
      { key: "ai_intensity_score", title: "AI Intensity", color: "#9b59b6", type: "ai" },
      { key: "salary_usd", title: "Avg Salary", color: "#1DD3B0", type: "ai_salary" },
      { key: "automation_risk_score", title: "Risk Score", color: "#e74c3c", type: "ai" },
      ...(overlay ? [{ key: "comparison", title: `Salary Trends: ${selectedIndustry}`, type: "dual" }] : []),
    ];








    const groups = svg.selectAll(".chart-group").data(charts, (d) => d.key);
    groups.exit().remove();
    const groupsEnter = groups
      .enter()
      .append("g")
      .attr("class", (d) => `chart-group group-${d.key}`);








    // Add grid group first so it stays behind lines
    groupsEnter.append("g").attr("class", "grid-lines");
    groupsEnter.append("path").attr("class", "line line-main").attr("fill", "none").attr("stroke-width", 3);
    groupsEnter
      .append("path")
      .attr("class", "line-secondary")
      .attr("fill", "none")
      .attr("stroke-width", 3)
      .style("stroke-dasharray", "4,4");
    groupsEnter.append("g").attr("class", "x-axis");
    groupsEnter.append("g").attr("class", "y-axis");
    groupsEnter
      .append("text")
      .attr("class", "y-axis-label")
      .style("font-size", "11px")
      .style("fill", "#64748b")
      .style("text-anchor", "middle");
    groupsEnter.append("text").attr("class", "chart-label").style("font-weight", "bold");



    const yLabels = {
      ai_mentioned: "AI Adoption Rate (%)",
      ai_intensity_score: "AI Intensity Score",
      salary_usd: "Avg Salary (USD)",
      automation_risk_score: "Automation Risk Score",
      comparison: "Salary (USD)",
    };





    const allGroups = groupsEnter.merge(groups);
    const t = d3
      .transition()
      .duration(isFirstRender.current ? 0 : 800)
      .ease(d3.easeCubicInOut);
    const width = overlay ? fullW - margin.left - margin.right : gridW - margin.left - 20;
    const height = overlay ? fullH - margin.top - margin.bottom : gridH - margin.top - margin.bottom;








    svg
      .transition(t)
      .attr("width", fullW)
      .attr("height", overlay ? fullH * 2 + 300 : gridH * 2 + 100);








    allGroups.each(function (chart, i) {
      const g = d3.select(this);
      const isDual = chart.type === "dual";
      const isSalaryChart = chart.type === "ai_salary" || isDual;
      const isAi = overlay && chart.type === "ai";
      const isMove = overlay && chart.type === "ai_salary";

      // Define once at the top of your drawing useEffect
      const lineGenMain = d3.line()
        .x((d) => x(d.posting_year))
        .y((d) => {
          // Determine the value based on chart type
          let val = isDual ? d.ai_salary_only : d[chart.key];

          // Scale 0-1 metrics (Risk/Intensity) to 0-100 ONLY for overlay view
          // Do NOT scale if it's a salary chart (isDual or isSalary)
          if (overlay && chart.type === "ai" && val <= 1.1) {
            val = val * 100;
          }
          return y(val);
        })
        .defined((d) => {
          const val = isDual ? d.ai_salary_only : d[chart.key];
          return val !== null && val !== undefined;
        })
        .curve(d3.curveMonotoneX);


      let targetX, targetY;
      if (overlay) {
        targetX = margin.left;
        targetY = isMove
          ? d3.interpolateNumber(margin.top, bottomChartY)(scrollProgress)
          : isAi
            ? margin.top
            : bottomChartY;
      } else {
        const row = Math.floor(i / 2),
          col = i % 2;
        targetX = col * (width + margin.left + 30) + margin.left;
        targetY = row * gridH + margin.top;
      }
      g.transition(t).attr("transform", `translate(${targetX}, ${targetY})`);








      const x = d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.posting_year))
        .range([0, width]);
      const isSalary = chart.key.includes("salary") || isDual || isMove;







      let y;
      // Ensure "dual" chart uses the salary scale, not the 0-100 scale
      if (isSalary || chart.type === "dual") {
        y = d3.scaleLinear().domain([0, 100000]).range([height, 0]);
      } else {
        const domainMax = overlay ? 100 : (d3.max(data, (d) => d[chart.key]) > 1.1 ? 100 : 1);
        y = d3.scaleLinear().domain([0, domainMax]).range([height, 0]);
      }








      // --- ADD GRID LINES ---
      const grid = g.select(".grid-lines");
      // Hide grid when AI metrics are stacked in overlay
      const showGrid = !(overlay && (chart.type === "ai" || chart.type === "ai_salary"));








      grid
        .transition(t)
        .style("opacity", showGrid ? 1 : 0)
        .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));








      grid.selectAll("line").attr("stroke", "#f0f0f0").attr("stroke-dasharray", "2,2");
      grid.select(".domain").remove();








      g.select(".chart-label")
        .transition(t)
        .attr("x", overlay && !isDual ? width + 15 : width / 2)
        .attr("y", overlay && !isDual ? i * 25 : -15)
        .attr("fill", isDual ? "#333" : chart.color)
        .attr("text-anchor", overlay && !isDual ? "start" : "middle")
        .text(chart.title);








      // Legend Logic
      let legend = g.select(".legend-container");
      if (isDual) {
        if (legend.empty()) legend = g.append("g").attr("class", "legend-container");
        legend.attr("transform", `translate(${width + 15}, 30)`);
        const items = [
          { label: "AI Jobs", color: "#bb1dd3", dash: "none" },
          { label: "Non-AI", color: "#FF6B6B", dash: "4,4" },
        ];
        const itemJoin = legend.selectAll(".legend-item").data(items);
        itemJoin.exit().remove();
        const itemEnter = itemJoin
          .enter()
          .append("g")
          .attr("class", "legend-item")
          .attr("transform", (d, idx) => `translate(0, ${idx * 50})`);
        itemEnter.append("line").attr("x1", 0).attr("x2", 20).attr("stroke-width", 3);
        itemEnter
          .append("text")
          .attr("x", 25)
          .attr("y", 5)
          .style("font-size", "11px")
          .style("font-family", "sans-serif");
        const itemMerge = itemEnter.merge(itemJoin);
        itemMerge
          .select("line")
          .attr("stroke", (d) => d.color)
          .style("stroke-dasharray", (d) => d.dash);
        itemMerge.select("text").text((d) => d.label);
      } else {
        g.select(".legend-container").remove();
      }







      const lineGenComp = d3.line()
        .x(d => x(d.posting_year))
        .y(d => y(d[`comp_${chart.key}`]))
        .defined(d => d[`comp_${chart.key}`] !== null)
        .curve(d3.curveMonotoneX);








      const lineGenSec = d3
        .line()
        .x((d) => x(d.posting_year))
        .y((d) => y(d.non_ai_salary))
        .defined(d => d.non_ai_salary > 0)
        .curve(d3.curveMonotoneX);








      // Render Main Line [cite: 363-366]
      g.select(".line-main")
        .transition(t)
        .attr("stroke", isDual ? "#bb1dd3" : chart.color) // Match AI Jobs legend color
        .attr("d", lineGenMain(data));
      const lineSec = g.selectAll(".line-non-ai").data(isDual ? [data] : []);
      lineSec.exit().remove();

      lineSec.enter()
        .append("path")
        .attr("class", "line-non-ai")
        .attr("fill", "none")
        .attr("stroke-width", 3)
        .style("stroke-dasharray", "4,4") // Make it dashed to match legend [cite: 466]
        .merge(lineSec)
        .transition(t)
        .attr("stroke", "#FF6B6B") // Non-AI color from your legend [cite: 466]
        .attr("d", isDual ? lineGenSec(data) : null);


      const showComp = !overlay && comparisonIndustry !== "None";
      g.select(".line-secondary")
        .transition(t)
        .style("opacity", showComp ? 0.6 : 0) // Lower opacity for comparison line
        .attr("stroke", chart.color) // Use same color but styled differently
        .style("stroke-dasharray", "4,4")
        .attr("d", showComp ? lineGenComp(data) : null);

      g.selectAll(".dot-main")
        .transition(t)
        .attr("fill", isDual ? "#9b59b6" : chart.color); // Matches the line color

      // Update Secondary Dot Color (Non-AI Jobs)
      g.selectAll(".dot-sec")
        .transition(t)
        .attr("fill", "#FF6B6B"); // Set to Red for Non-AI comparison








      g.select(".x-axis")
        .attr("transform", `translate(0, ${height})`)
        .transition(t)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));








      const isPrimaryAiChart = overlay && chart.key === "ai_mentioned";








      const yAxisOpacity = overlay && !isPrimaryAiChart && chart.type !== "dual" ? 0 : 1;








      g.select(".y-axis")
        .transition(t)
        .style("opacity", yAxisOpacity)
        .call(
          d3
            .axisLeft(y)
            .ticks(5)
            .tickFormat((d) => {
              if (isSalary) return d3.format("$.2s")(d);
              return overlay ? `${d}%` : d3.format(".1f")(d);
            }),
        );








      // Update y-axis label
      g.select(".y-axis-label")
        .text(yLabels[chart.key] || "")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 12)
        .style("opacity", yAxisOpacity);








      // Dots
      const dotsMain = g.selectAll(".dot-main").data(data);
      dotsMain.exit().remove();
      // ... inside your d3 drawing loop
      dotsMain
        .enter()
        .append("circle")
        .attr("class", "dot-main")
        .attr("r", 4)
        .merge(dotsMain)
        // Ensure there is NO semicolon here
        .on("mouseover", (e, d) => {
          let rawVal = isDual ? d.ai_salary_only : d[chart.key];

          // Maintain the scaling logic for overlay view so dots align with lines
          if (overlay && chart.type === "ai" && rawVal <= 1.1) {
            rawVal = rawVal * 100;
          }

          tooltip
            .style("opacity", 1)
            .html(`
        <strong>${d.posting_year}</strong><br/>
        ${chart.title}: ${isSalary ? d3.format("$,.0f")(rawVal) : d3.format(".2f")(rawVal)}
      `);
        }) // This parenthesis closes .on("mouseover")
        .on("mousemove", (e) => {
          tooltip
            .style("left", e.clientX + 15 + "px")
            .style("top", e.clientY - 40 + "px");
        }) // This parenthesis closes .on("mousemove")
        .on("mouseout", () => {
          tooltip.style("opacity", 0);
        })
        .transition(t)
  .attr("cx", (d) => x(d.posting_year))
  .attr("cy", (d) => {
    let val = isDual ? d.ai_salary_only : d[chart.key];
    if (overlay && chart.type === "ai" && val <= 1.1) {
      val = val * 100;
    }
    return y(val);
  })
  // CHANGE THIS LINE:
  .attr("fill", isDual ? "#bb1dd3" : chart.color);







      const dotsSec = g.selectAll(".dot-sec").data(isDual ? data : []);
      dotsSec.exit().remove();
      dotsSec
        .enter()
        .append("circle")
        .attr("class", "dot-sec")
        .attr("r", 4)
        .merge(dotsSec)
        .on("mouseover", (e, d) => {
          tooltip
            .style("opacity", 1)
            .html(`<strong>${d.posting_year}</strong><br/>Non-AI: ${d3.format("$,.0f")(d.non_ai_salary)}`);
        })
        .on("mousemove", (e) => tooltip.style("left", e.clientX + 15 + "px").style("top", e.clientY - 40 + "px"))
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition(t)
        .attr("fill", "#FF6B6B")
        .attr("cx", (d) => x(d.posting_year))
        .attr("cy", (d) => y(d.non_ai_salary));
    });








    isFirstRender.current = false;
  }, [data, overlay, scrollProgress, selectedIndustry]);








return (
  <div style={{ 
    // This provides the "track" for scrolling. 
    // When overlay is true, we make it tall so there is room to scroll.
    height: overlay ? "200vh" : "auto", 
    position: "relative",
    marginTop: "40px" 
  }}>
    <div
      ref={chartRef}
      style={{
        // Pins the chart to the top while scrolling through the 200vh track
        position: overlay ? "sticky" : "relative",
        top: overlay ? "50px" : "0px",
        background: "white",
        padding: "40px",
        borderRadius: "16px",
        boxShadow: overlay ? "0 10px 30px rgba(0,0,0,0.1)" : "none",
        zIndex: 5,
        margin: "0 auto",
        width: "fit-content",
        transition: "box-shadow 0.3s ease"
      }}
    />
  </div>
);


}








export default Task3Linechart;




























