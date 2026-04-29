import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { dbUrl } from "../utils/paths";

function AiHeatmap({selectedIndustry}) {
  const [data, setData] = useState([]);
  const [intensityThreshold, setIntensityThreshold] = useState(0.1);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  const width = 800;
  const height = 480;
  const margin = { top: 60, right: 40, bottom: 100, left: 80 };

  useEffect(() => {
    d3.csv(dbUrl("ai_impact_jobs_2010_2025.csv"))
      .then((raw) => {
        const parsedData = raw.map((d) => ({
          industry: d.industry,
          salary: +d.salary_usd || 0,
          ai_intensity: +d.ai_intensity_score || 0,
        }));
        setData(parsedData);
      })
      .catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    if (data.length === 0) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    svg.selectAll("*").remove();

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const mainGroup = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const industries = [...new Set(data.map((d) => d.industry))];
    const gridRows = 15;

    const xScale = d3.scaleBand().domain(industries).range([0, innerWidth]).padding(0.05);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.salary) * 1.05])
      .range([innerHeight, 0]);

    const yMax = d3.max(data, (d) => d.salary) * 1.05;
    const yStep = yMax / gridRows;

    const gridData = [];
    industries.forEach((ind) => {
      for (let j = 0; j < gridRows; j++) {
        const yMin = j * yStep;
        const yMaxVal = (j + 1) * yStep;

        const pointsInBin = data.filter((d) => d.industry === ind && d.salary >= yMin && d.salary < yMaxVal);

        if (pointsInBin.length > 0) {
          const avgIntensity = d3.mean(pointsInBin, (d) => d.ai_intensity);

          gridData.push({
            industry: ind,
            yIndex: j,
            count: pointsInBin.length,
            avgIntensity: avgIntensity,
          });
        }
      }
    });

    const maxCount = d3.max(gridData, (d) => d.count) || 1;

    const colorScale = d3.scaleSequential().domain([0, maxCount]).interpolator(d3.interpolateBlues);

    mainGroup
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-35)")
      .style("text-anchor", "end")
      .style("font-size", "11px");

    mainGroup
      .append("g")
      .call(d3.axisLeft(yScale).tickFormat(d3.format("$,.0f")))
      .append("text")
      .attr("x", -innerHeight / 2)
      .attr("y", -65)
      .attr("fill", "black")
      .attr("transform", "rotate(-90)")
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Salary (USD)");

    const blockWidth = xScale.bandwidth();
    const blockHeight = innerHeight / gridRows;

    mainGroup
      .selectAll(".bin")
      .data(gridData)
      .enter()
      .append("rect")
      .attr("class", "bin")
      .attr("x", (d) => xScale(d.industry))
      .attr("y", (d) => innerHeight - (d.yIndex + 1) * blockHeight)
      .attr("width", blockWidth)
      .attr("height", blockHeight - 1)
      .attr("fill", (d) => colorScale(d.count))
      .style("opacity", (d) => (d.avgIntensity >= intensityThreshold ? 1 : 0.05))
      .style("stroke", "#fff")
      .style("stroke-width", "0.5px")
      .on("mouseover", function (event, d) {
        tooltip.style("opacity", 1);
        tooltip.html(
          `<strong>${d.industry}</strong><br/>Jobs: ${d.count}<br/>Avg Intensity: ${d.avgIntensity.toFixed(2)}`,
        );
        d3.select(this).style("stroke", "#000").style("stroke-width", "1.5px");
      })
      .on("mousemove", function (event) {
        const [x, y] = d3.pointer(event, svgRef.current);
        tooltip.style("left", `${x + 15}px`).style("top", `${y + 15}px`);
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
        d3.select(this).style("stroke", "#fff").style("stroke-width", "0.5px");
      });

    const legendWidth = 200;
    const legendHeight = 10;

    const legendGroup = mainGroup.append("g").attr("transform", `translate(${innerWidth - legendWidth - 100}, -30)`);

    const defs = svg.append("defs");
    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "blue-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    linearGradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(0));
    linearGradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxCount));

    legendGroup
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#blue-gradient)");

    legendGroup
      .append("text")
      .attr("x", -5)
      .attr("y", 9)
      .attr("text-anchor", "end")
      .style("font-size", "11px")
      .text("Low density (0 jobs)");

    legendGroup
      .append("text")
      .attr("x", legendWidth + 5)
      .attr("y", 9)
      .style("font-size", "11px")
      .text(`High density (${maxCount} jobs)`);
  }, [data]);

  useEffect(() => {
    if (data.length === 0) return;

    d3.select(svgRef.current)
      .selectAll(".bin")
      .transition()
      .duration(300)
      .style("opacity", (d) => {
        const passesIntensity = d.avgIntensity >= intensityThreshold;
        
      
        const isSelected = !selectedIndustry || 
                           selectedIndustry === "Market Average" || 
                           selectedIndustry === d.industry;

        if (!passesIntensity) return 0;

      if (!isSelected) return 0.1;

      return 1;
      })
      // .style("stroke", (d) => (selectedIndustry === d.industry ? "#2d3c4f" : "#fff"))
      // .style("stroke-width", (d) => (selectedIndustry === d.industry ? "1.5px" : "0.5px"));

  }, [intensityThreshold, data, selectedIndustry]); 

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "980px",
        margin: "0 auto",
        textAlign: "center",
        fontFamily: "sans-serif",
      }}
    >
      <h2>Job Density: Industry vs. Salary Brackets</h2>

      <svg ref={svgRef}></svg>

      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          opacity: 0,
          backgroundColor: "white",
          border: "1px solid #ddd",
          padding: "8px",
          borderRadius: "4px",
          pointerEvents: "none",
          fontSize: "12px",
          textAlign: "left",
          boxShadow: "0px 2px 5px rgba(0,0,0,0.15)",
          zIndex: 10,
        }}
      ></div>

      <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#f4f4f4", borderRadius: "8px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
          Highlight Blocks with Avg AI Intensity Above:{" "}
          <span style={{ color: "#007bff" }}>{intensityThreshold.toFixed(2)}</span>
        </label>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={intensityThreshold}
          onChange={(e) => setIntensityThreshold(+e.target.value)}
          style={{ width: "80%", cursor: "pointer" }}
        />
      </div>
    </div>
  );
}

// ─── Part 2: Job Count by Category ──────────────────────────
function AiJobCount() {
  const [jobDensityData, setJobDensityData] = useState([]);
  const [showAllSubcategories, setShowAllSubcategories] = useState(false);
  const [segmentedContainerWidth, setSegmentedContainerWidth] = useState(980);
  const segmentedSvgRef = useRef(null);
  const segmentedContainerRef = useRef(null);
  const segmentedTooltipRef = useRef(null);

  useEffect(() => {
    const mapToGroup = (s) => {
      if (!s) return "Other";
      const str = s.toString().toLowerCase();
      if (str.includes("manufactur") || str.includes("transport") || str.includes("logistic")) return "Manufacture";
      if (
        str.includes("information") ||
        str.includes("communication") ||
        str.includes("ict") ||
        str.includes("it") ||
        str.includes("tech") ||
        str.includes("software") ||
        str.includes("computer")
      )
        return "Tech";
      if (str.includes("bank") || str.includes("finance") || str.includes("account") || str.includes("financial"))
        return "Finance";
      return "Other";
    };

    Promise.all([d3.csv(dbUrl("jobstreet_all_job_dataset.csv")), d3.csv(dbUrl("ai_job_trends_dataset.csv"))])
      .then(([jobsRaw, riskRaw]) => {
        const targetOrder = ["Tech", "Finance", "Manufacture"];
        const targetSet = new Set(targetOrder);
        const headerKeys = riskRaw && riskRaw.length > 0 ? Object.keys(riskRaw[0]) : [];
        const yearKeyMatches = headerKeys
          .map((k) => {
            const m = k.match(/automation\s*risk[^\d]*(\d{4})/i);
            return m ? { key: k, year: +m[1] } : null;
          })
          .filter(Boolean);

        let chosenRiskKey = null;
        if (yearKeyMatches.length > 0) {
          const latestYear = d3.max(yearKeyMatches, (d) => d.year);
          chosenRiskKey = yearKeyMatches.find((d) => d.year === latestYear).key;
        } else {
          chosenRiskKey = headerKeys.find((k) => /automation\s*risk/i.test(k));
        }

        const safeRisk = (row) => {
          if (!row) return 0;
          if (chosenRiskKey && Object.prototype.hasOwnProperty.call(row, chosenRiskKey)) return +row[chosenRiskKey] || 0;
          const fallbackKey = Object.keys(row).find((k) => /automation\s*risk/i.test(k));
          return fallbackKey ? +row[fallbackKey] || 0 : 0;
        };

        const riskByGroup = d3.rollups(
          riskRaw,
          (v) => d3.mean(v, (d) => safeRisk(d)),
          (d) => mapToGroup(d.Industry),
        );
        const riskMap = Object.fromEntries(riskByGroup);
        const overallAvgRisk = d3.mean(riskRaw, (d) => safeRisk(d)) || 0;

        const parsed = jobsRaw
          .map((d) => ({
            category: mapToGroup(d.category),
            subcategory: (d.subcategory || "").trim(),
          }))
          .filter((d) => targetSet.has(d.category) && d.subcategory);

        const grouped = d3.rollups(
          parsed,
          (v) => v.length,
          (d) => d.category,
          (d) => d.subcategory,
        );

        const panels = targetOrder.map((category) => {
          const found = grouped.find((g) => g[0] === category);
          const risk = riskMap[category] ?? overallAvgRisk;
          const weight = isFinite(risk) ? risk / 100 : 1;
          const subcategories = found
            ? found[1]
                .map(([subcategory, count]) => ({
                  subcategory,
                  count,
                  weightedCount: count * weight,
                }))
                .sort((a, b) => d3.descending(a.weightedCount, b.weightedCount))
            : [];

          return {
            category,
            risk,
            subcategories,
          };
        });

        setJobDensityData(panels);
      })
      .catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    if (!segmentedContainerRef.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width;
      if (width) setSegmentedContainerWidth(width);
    });
    observer.observe(segmentedContainerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (jobDensityData.length === 0) return;

    const panelDataForView = jobDensityData.map((panel) => {
      if (showAllSubcategories) return panel;

      const topN = 10;
      const sorted = [...panel.subcategories].sort((a, b) => d3.descending(a.weightedCount, b.weightedCount));
      const top = sorted.slice(0, topN);
      const rest = sorted.slice(topN);
      if (rest.length === 0) return { ...panel, subcategories: top };

      const others = {
        subcategory: "Others",
        count: d3.sum(rest, (d) => d.count),
        weightedCount: d3.sum(rest, (d) => d.weightedCount),
      };
      return { ...panel, subcategories: [...top, others] };
    });

    const segmentedWidth = Math.max(860, Math.floor(segmentedContainerWidth || 860));
    const segmentedMargin = { top: 28, right: 24, bottom: 32, left: 12 };
    const panelGap = 24;
    const panelTitleHeight = 28;
    const barHeight = 18;
    const barGap = 8;
    const panelInnerLeft = 132;
    const panelInnerRight = 34;
    const panelHeights = panelDataForView.map((d) => (d.subcategories.length || 1) * (barHeight + barGap) + 20);
    const maxPanelHeight = d3.max(panelHeights) || 180;
    const segmentedHeight = segmentedMargin.top + segmentedMargin.bottom + panelTitleHeight + maxPanelHeight;

    const svg = d3.select(segmentedSvgRef.current);
    const tooltip = d3.select(segmentedTooltipRef.current);
    svg.selectAll("*").remove();

    const chartWidth = segmentedWidth - segmentedMargin.left - segmentedMargin.right;
    const panelWidth = (chartWidth - panelGap * 2) / 3;
    const categoryColors = {
      Tech: "#2563eb",
      Finance: "#0f766e",
      Manufacture: "#b45309",
    };

    const mainGroup = svg
      .attr("width", segmentedWidth)
      .attr("height", segmentedHeight)
      .append("g")
      .attr("transform", `translate(${segmentedMargin.left},${segmentedMargin.top})`);

    panelDataForView.forEach((panel, panelIndex) => {
      const panelXOffset = panelIndex * (panelWidth + panelGap);
      const panelHeight = (panel.subcategories.length || 1) * (barHeight + barGap) + 20;
      const panelGroup = mainGroup.append("g").attr("transform", `translate(${panelXOffset},0)`);
      const panelColor = categoryColors[panel.category] || "#334155";
      const xMax = d3.max(panel.subcategories, (d) => d.weightedCount) || 1;
      const plotWidth = Math.max(90, panelWidth - panelInnerLeft - panelInnerRight);
      const xScale = d3.scaleLinear().domain([0, xMax]).nice().range([0, plotWidth]);
      const yScale = d3
        .scaleBand()
        .domain(panel.subcategories.map((d) => d.subcategory))
        .range([0, panelHeight - 20])
        .padding(0.28);

      panelGroup
        .append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("fill", panelColor)
        .style("font-size", "15px")
        .style("font-weight", "700")
        .text(`${panel.category} (Risk: ${(panel.risk || 0).toFixed(1)}%)`);

      const chartGroup = panelGroup.append("g").attr("transform", `translate(${panelInnerLeft},${panelTitleHeight})`);

      chartGroup
        .append("g")
        .call(d3.axisLeft(yScale).tickSize(0))
        .call((g) => g.select(".domain").remove())
        .selectAll("text")
        .style("font-size", "10px")
        .style("fill", "#1f2937")
        .style("text-anchor", "end");

      chartGroup
        .append("g")
        .attr("transform", `translate(0,${panelHeight - 20})`)
        .call(d3.axisBottom(xScale).ticks(4).tickFormat(d3.format(",.0f")))
        .call((g) => g.select(".domain").attr("stroke", "#9ca3af"))
        .call((g) => g.selectAll("line").attr("stroke", "#d1d5db"))
        .call((g) => g.selectAll("text").style("font-size", "10px").style("fill", "#4b5563"));

      const bars = chartGroup.selectAll(".subcategory-bar").data(panel.subcategories).enter().append("g");

      bars
        .append("rect")
        .attr("class", "subcategory-bar")
        .attr("x", 0)
        .attr("y", (d) => yScale(d.subcategory) || 0)
        .attr("width", (d) => xScale(d.weightedCount))
        .attr("height", yScale.bandwidth())
        .attr("rx", 4)
        .attr("fill", panelColor)
        .attr("opacity", 0.9)
        .on("mouseover", function (event, d) {
          tooltip.style("opacity", 1);
          tooltip.html(
            `<strong>${panel.category}</strong><br/>Subcategory: ${d.subcategory}<br/>Jobs: ${d.count}<br/>Risk-weighted: ${Math.round(d.weightedCount)}`,
          );
          d3.select(this).attr("opacity", 1);
        })
        .on("mousemove", function (event) {
          const [x, y] = d3.pointer(event, segmentedSvgRef.current);
          tooltip.style("left", `${x + 15}px`).style("top", `${y + 15}px`);
        })
        .on("mouseout", function () {
          tooltip.style("opacity", 0);
          d3.select(this).attr("opacity", 0.9);
        });

      bars
        .append("text")
        .attr("x", (d) => {
          const w = xScale(d.weightedCount);
          return w >= 46 ? w - 6 : Math.min(w + 6, plotWidth - 2);
        })
        .attr("y", (d) => (yScale(d.subcategory) || 0) + yScale.bandwidth() / 2 + 3)
        .style("font-size", "9px")
        .style("font-weight", "600")
        .style("fill", (d) => (xScale(d.weightedCount) >= 46 ? "#ffffff" : "#334155"))
        .style("text-anchor", (d) => (xScale(d.weightedCount) >= 46 ? "end" : "start"))
        .text((d) => d3.format(",.0f")(d.weightedCount));
    });

    svg.attr("viewBox", `0 0 ${segmentedWidth} ${segmentedHeight}`).attr("preserveAspectRatio", "xMinYMin meet");
  }, [jobDensityData, segmentedContainerWidth, showAllSubcategories]);

  return (
    <div
      ref={segmentedContainerRef}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "980px",
        margin: "0 auto",
        textAlign: "left",
        background: "#ffffff",
        borderRadius: "10px",
        overflowX: "hidden",
      }}
    >
      <h3 style={{ textAlign: "center", marginBottom: "6px" }}>Risk-weighted Job Count by Subcategory</h3>
      <p style={{ textAlign: "center", marginTop: 0, color: "#4b5563", fontSize: "12px" }}>
        Focused view: Tech, Finance, and Manufacture. Each bar chart shows subcategory demand adjusted by category risk.
      </p>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
        <button
          type="button"
          onClick={() => setShowAllSubcategories((v) => !v)}
          style={{
            border: "1px solid #cbd5e1",
            background: showAllSubcategories ? "#0f172a" : "#ffffff",
            color: showAllSubcategories ? "#ffffff" : "#0f172a",
            borderRadius: "999px",
            padding: "6px 12px",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {showAllSubcategories ? "Show Top 10 + Others" : "Show All Subcategories"}
        </button>
      </div>

      <svg ref={segmentedSvgRef} style={{ width: "100%", height: "auto", display: "block" }}></svg>

      <div
        ref={segmentedTooltipRef}
        style={{
          position: "absolute",
          opacity: 0,
          backgroundColor: "white",
          border: "1px solid #ddd",
          padding: "8px",
          borderRadius: "4px",
          pointerEvents: "none",
          fontSize: "12px",
          textAlign: "left",
          boxShadow: "0px 2px 5px rgba(0,0,0,0.15)",
          zIndex: 10,
        }}
      ></div>
    </div>
  );
}

export { AiHeatmap, AiJobCount };
