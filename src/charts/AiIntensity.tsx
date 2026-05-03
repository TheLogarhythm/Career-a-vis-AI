import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { dbUrl } from "../utils/paths";

function AiHeatmap({ selectedIndustry }) {
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

  const bubbleBottomStyle = (targetValue) => {
    const positionPercent = targetValue * 80;

    return {
      position: "absolute",
      top: "35px",

      left: `calc(${positionPercent}% + 94px)`,
      transform: "translateX(-50%)",
      backgroundColor: "#007bff",
      color: "#fff",
      padding: "6px 12px",
      borderRadius: "6px",
      fontSize: "12px",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      zIndex: 10,
      boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
      transition: "all 0.3s ease", // Smooth appearance
    };
  };

  const arrowUpStyle = {
    position: "absolute",
    top: "-6px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "0",
    height: "0",
    borderLeft: "6px solid transparent",
    borderRight: "6px solid transparent",
    borderBottom: "6px solid #007bff",
  };

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

        const isSelected =
          !selectedIndustry || selectedIndustry === "Market Average" || selectedIndustry === d.industry;

        if (!passesIntensity) return 0;

        if (!isSelected) return 0.1;

        return 1;
      });
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

      <div
        style={{
          marginTop: "15px",
          padding: "15px",
          paddingBottom: "45px", // Extra space for the bubble below
          backgroundColor: "#f4f4f4",
          borderRadius: "8px",
          position: "relative",
        }}
      >
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
          Highlight Blocks with Avg AI Intensity Above:{" "}
          <span style={{ color: "#007bff" }}>{intensityThreshold.toFixed(2)}</span>
        </label>

        <div style={{ position: "relative", width: "100%" }}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={intensityThreshold}
            onChange={(e) => setIntensityThreshold(+e.target.value)}
            style={{ width: "80%", cursor: "pointer" }}
          />

          {/* Bubble 1: Shown until 0.4 */}
          {intensityThreshold <= 0.4 && (
            <div style={bubbleBottomStyle(0.4)}>
              <div style={arrowUpStyle} />
              At 0.4, only blocks with salary ≥ $90k are highlighted
            </div>
          )}

          {/* Bubble 2: Points at 0.8 */}
          {intensityThreshold > 0.4 && intensityThreshold <= 0.85 && (
            <div style={bubbleBottomStyle(0.85)}>
              <div style={arrowUpStyle} />
              At 0.85, no block is highlighted
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Part 2: Job Count by Category ──────────────────────────
function AiJobCount() {
  const TARGET_CATEGORIES = [
    "Agriculture",
    "Education",
    "Energy",
    "Finance",
    "Government",
    "Healthcare",
    "Manufacturing",
    "Retail",
    "Tech",
  ];
  const [jobDensityData, setJobDensityData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [segmentedContainerWidth, setSegmentedContainerWidth] = useState(980);
  const segmentedSvgRef = useRef(null);
  const segmentedContainerRef = useRef(null);
  const segmentedTooltipRef = useRef(null);
  const categoryColorMap = {
    Agriculture: "#2f855a",
    Education: "#2c7a7b",
    Energy: "#b7791f",
    Finance: "#2b6cb0",
    Government: "#4a5568",
    Healthcare: "#c05621",
    Manufacturing: "#285e61",
    Retail: "#805ad5",
    Tech: "#0f4c81",
  };

  useEffect(() => {
    const STOP_WORDS = new Set([
      "and",
      "or",
      "the",
      "of",
      "to",
      "for",
      "in",
      "on",
      "with",
      "by",
      "from",
      "at",
      "a",
      "an",
      "as",
      "amp",
      "services",
      "service",
      "support",
      "management",
      "operations",
      "operation",
    ]);
    const tokenize = (s) =>
      (s || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t && t.length > 2 && !STOP_WORDS.has(t));

    const mapRawCategoryToTarget = (s) => {
      const str = (s || "").toLowerCase();
      if (
        str.includes("agri") ||
        str.includes("farm") ||
        str.includes("fishing") ||
        str.includes("forestry") ||
        str.includes("animals") ||
        str.includes("conservation")
      )
        return "Agriculture";
      if (str.includes("education") || str.includes("training")) return "Education";
      if (str.includes("energy") || str.includes("utility") || str.includes("oil") || str.includes("gas"))
        return "Energy";
      if (str.includes("bank") || str.includes("finance") || str.includes("account")) return "Finance";
      if (
        str.includes("government") ||
        str.includes("public") ||
        str.includes("defence") ||
        str.includes("defense") ||
        str.includes("policy")
      )
        return "Government";
      if (str.includes("health") || str.includes("medical")) return "Healthcare";
      if (
        str.includes("manufactur") ||
        str.includes("engineering") ||
        str.includes("construction") ||
        str.includes("transport") ||
        str.includes("logistic") ||
        str.includes("trades")
      )
        return "Manufacturing";
      if (str.includes("retail") || str.includes("customer service") || str.includes("sales")) return "Retail";
      if (
        str.includes("information") ||
        str.includes("communication") ||
        str.includes("technology") ||
        str.includes("ict") ||
        str.includes("it") ||
        str.includes("software") ||
        str.includes("computer")
      )
        return "Tech";
      return "Retail";
    };

    const mapTargetCategoryToRiskIndustry = (s) => {
      const str = (s || "").toLowerCase();
      if (str === "tech") return "IT";
      if (str === "finance") return "Finance";
      if (str === "manufacturing") return "Manufacturing";
      if (str === "healthcare") return "Healthcare";
      if (str === "education") return "Education";
      if (str === "retail") return "Retail";
      if (str === "government") return "Education";
      if (str === "energy") return "Manufacturing";
      if (str === "agriculture") return "Transportation";
      return "IT";
    };

    Promise.all([d3.csv(dbUrl("jobstreet_all_job_dataset.csv")), d3.csv(dbUrl("ai_job_trends_dataset.csv"))])
      .then(([jobsRaw, riskRaw]) => {
        const riskByIndustry = Object.fromEntries(
          d3.rollups(
            riskRaw,
            (v) => d3.mean(v, (d) => +d["Automation Risk (%)"] || 0),
            (d) => (d.Industry || "").trim(),
          ),
        );
        const overallAvgRisk = d3.mean(riskRaw, (d) => +d["Automation Risk (%)"] || 0) || 50;

        const cleanRows = jobsRaw
          .map((d) => ({
            category: mapRawCategoryToTarget(d.category),
            rawCategory: (d.category || "").trim(),
            subcategory: (d.subcategory || "").trim(),
            jobTitle: (d.job_title || "").trim(),
          }))
          .filter((d) => d.category && d.subcategory);
        const targetSet = new Set(TARGET_CATEGORIES);
        const riskRows = riskRaw.map((d) => ({
          industry: (d.Industry || "").trim(),
          risk: +d["Automation Risk (%)"] || 0,
          titleTokens: tokenize(d["Job Title"] || ""),
        }));

        const estimateSubcategoryRisk = (subcategory, jobTitles, mappedIndustry) => {
          const subTokens = tokenize(subcategory);
          const titleTokenSet = new Set(jobTitles.flatMap((t) => tokenize(t)));
          const queryTokens = Array.from(new Set([...subTokens, ...Array.from(titleTokenSet)]));
          const querySet = new Set(queryTokens);
          const relevantIndustryRows = riskRows.filter((r) => r.industry === mappedIndustry);

          const matches = relevantIndustryRows.filter((r) => r.titleTokens.some((token) => querySet.has(token)));
          if (matches.length > 0) return d3.mean(matches, (m) => m.risk) || overallAvgRisk;

          const broadMatches = riskRows.filter((r) => r.titleTokens.some((token) => querySet.has(token)));
          if (broadMatches.length > 0) return d3.mean(broadMatches, (m) => m.risk) || overallAvgRisk;

          return riskByIndustry[mappedIndustry] ?? overallAvgRisk;
        };

        const grouped = d3.rollups(
          cleanRows.filter((d) => targetSet.has(d.category)),
          (v) => ({
            count: v.length,
            jobTitles: v.map((x) => x.jobTitle).filter(Boolean),
          }),
          (d) => d.category,
          (d) => d.subcategory,
        );

        const panels = TARGET_CATEGORIES.map((category) => {
          const found = grouped.find((g) => g[0] === category);
          const mappedIndustry = mapTargetCategoryToRiskIndustry(category);
          const subcategories = (found?.[1] || [])
            .map(([subcategory, stats]) => {
              const subRisk = estimateSubcategoryRisk(subcategory, stats.jobTitles || [], mappedIndustry);
              const weight = isFinite(subRisk) ? subRisk / 100 : 0.5;
              return {
              subcategory,
              count: stats.count,
              risk: subRisk,
              weightedCount: stats.count * weight,
              };
            })
            .sort((a, b) => d3.descending(a.weightedCount, b.weightedCount));

          const totalCount = d3.sum(subcategories, (d) => d.count);
          const totalWeightedCount = d3.sum(subcategories, (d) => d.weightedCount);
          const risk =
            totalCount > 0
              ? d3.sum(subcategories, (d) => d.risk * d.count) / totalCount
              : riskByIndustry[mappedIndustry] ?? overallAvgRisk;
          return { category, risk, subcategories, totalCount, totalWeightedCount };
        });

        setJobDensityData(panels);
        if (panels.length > 0) setSelectedCategory(panels[0].category);
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
    if (jobDensityData.length === 0 || !selectedCategory) return;
    const panel = jobDensityData.find((d) => d.category === selectedCategory);
    if (!panel) return;

    const segmentedWidth = Math.max(760, Math.floor(segmentedContainerWidth || 760));
    const segmentedHeight = 560;
    const packPadding = 4;
    const circleAreaSize = Math.max(320, Math.min(520, segmentedWidth - 120));
    const centerX = segmentedWidth / 2;
    const centerY = segmentedHeight / 2 + 20;
    const subcategoryCap = 35;
    const filteredNodes = panel.subcategories.slice(0, subcategoryCap);
    const hierarchyData = {
      name: panel.category,
      children: filteredNodes.map((d) => ({
        name: d.subcategory,
        count: d.count,
        value: d.weightedCount,
      })),
    };
    const root = d3.hierarchy(hierarchyData).sum((d) => d.value || 0);
    d3.pack().size([circleAreaSize, circleAreaSize]).padding(packPadding)(root);

    const leaves = root.leaves();
    const maxValue = d3.max(leaves, (d) => d.value || 0) || 1;
    const minValue = d3.min(leaves, (d) => d.value || 0) || 0;
    const accent = categoryColorMap[panel.category] || "#0f4c81";
    const colorScale = d3
      .scaleLinear()
      .domain([minValue, maxValue])
      .range(["#eaf4ff", accent])
      .interpolate(d3.interpolateLab);

    const svg = d3.select(segmentedSvgRef.current);
    const tooltip = d3.select(segmentedTooltipRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", segmentedWidth).attr("height", segmentedHeight);

    const mainGroup = svg
      .append("g")
      .attr("transform", `translate(${centerX - circleAreaSize / 2},${centerY - circleAreaSize / 2})`);

    mainGroup
      .append("circle")
      .attr("cx", circleAreaSize / 2)
      .attr("cy", circleAreaSize / 2)
      .attr("r", circleAreaSize / 2)
      .attr("fill", "#fdfefe")
      .attr("stroke", "#dbe3ee")
      .attr("stroke-width", 1.2);

    const nodes = mainGroup
      .selectAll(".pack-node")
      .data(leaves)
      .enter()
      .append("g")
      .attr("class", "pack-node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    nodes
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => colorScale(d.value || 0))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.2)
      .attr("opacity", 0.92)
      .on("mouseover", function (event, d) {
        const beforePct = panel.totalCount > 0 ? ((d.data.count / panel.totalCount) * 100).toFixed(1) : "0.0";
        const afterPct =
          panel.totalWeightedCount > 0 ? (((d.value || 0) / panel.totalWeightedCount) * 100).toFixed(1) : "0.0";
        tooltip.style("opacity", 1);
        tooltip.html(
          `<strong>${panel.category}</strong><br/>Subcategory: ${d.data.name}<br/>Before risk-weighting: ${beforePct}%<br/>After risk-weighting: ${afterPct}%`,
        );
        d3.select(this).attr("stroke", "#334155").attr("stroke-width", 1.5);
      })
      .on("mousemove", function (event) {
        const [x, y] = d3.pointer(event, segmentedSvgRef.current);
        tooltip.style("left", `${x + 14}px`).style("top", `${y + 14}px`);
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
        d3.select(this).attr("stroke", "#ffffff").attr("stroke-width", 1.2);
      });

    const formatLabel = (rawLabel, radius, fontSize) => {
      const label = (rawLabel || "").trim();
      if (!label || radius < 17) return [];

      const maxCharsPerLine = Math.max(6, Math.floor((radius * 1.6) / (fontSize * 0.56)));
      const maxLines = radius >= 30 ? 2 : 1;

      if (label.length <= maxCharsPerLine) return [label];

      if (maxLines === 1) {
        return [`${label.slice(0, Math.max(4, maxCharsPerLine - 1)).trimEnd()}…`];
      }

      const words = label.split(/\s+/).filter(Boolean);
      const lines = [];
      let current = "";

      for (const w of words) {
        const candidate = current ? `${current} ${w}` : w;
        if (candidate.length <= maxCharsPerLine) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = w;
          if (lines.length === maxLines - 1) break;
        }
      }

      if (lines.length < maxLines && current) lines.push(current);
      while (lines.length < maxLines) lines.push("");

      const joinedLen = lines.join("").length;
      if (joinedLen < label.replace(/\s+/g, "").length && lines[maxLines - 1]) {
        const last = lines[maxLines - 1];
        lines[maxLines - 1] = `${last.slice(0, Math.max(3, maxCharsPerLine - 1)).trimEnd()}…`;
      }

      return lines.filter(Boolean);
    };

    const textNodes = nodes
      .filter((d) => d.r >= 17)
      .append("text")
      .style("font-size", (d) => `${Math.min(12, Math.max(8.5, d.r / 3.5))}px`)
      .style("font-weight", (d) => (d.r >= 30 ? "600" : "500"))
      .style("fill", "#0f172a")
      .style("text-anchor", "middle")
      .style("pointer-events", "none");

    textNodes.each(function (d) {
      const text = d3.select(this);
      const fontSize = Math.min(12, Math.max(8.5, d.r / 3.5));
      const lines = formatLabel(d.data.name || "", d.r, fontSize);
      if (lines.length === 0) {
        text.remove();
        return;
      }

      const lineHeight = fontSize * 1.05;
      const totalHeight = lineHeight * lines.length;
      const startDy = -totalHeight / 2 + lineHeight * 0.82;

      lines.forEach((line, idx) => {
        text
          .append("tspan")
          .attr("x", 0)
          .attr("dy", idx === 0 ? startDy : lineHeight)
          .text(line);
      });
    });

    svg.attr("viewBox", `0 0 ${segmentedWidth} ${segmentedHeight}`).attr("preserveAspectRatio", "xMinYMin meet");
  }, [jobDensityData, segmentedContainerWidth, selectedCategory]);

  return (
    <div
      ref={segmentedContainerRef}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "980px",
        margin: "0 auto",
        textAlign: "left",
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        borderRadius: "10px",
        overflowX: "hidden",
        border: "1px solid #e5eaf2",
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
      }}
    >
      <h3
        style={{
          textAlign: "center",
          marginBottom: "6px",
          letterSpacing: "0.01em",
          color: "#1f2937",
        }}
      >
        Risk-weighted Job Count by Subcategory
      </h3>
      <p
        style={{
          textAlign: "center",
          marginTop: 0,
          color: "#4b5563",
          fontSize: "12px",
          letterSpacing: "0.02em",
        }}
      >
        Circle area encodes risk-weighted job count. Select one category to compare subcategory demand distribution.
      </p>
      <p
        style={{
          textAlign: "center",
          marginTop: "0px",
          marginBottom: "10px",
          color: "#6b7280",
          fontSize: "11px",
        }}
      >
        Risk-weighted means raw job count multiplied by the category's average automation risk (%).
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginBottom: "10px" }}>
        {jobDensityData.map((d) => (
          <button
            key={d.category}
            type="button"
            onClick={() => setSelectedCategory(d.category)}
            style={{
              border: `1px solid ${selectedCategory === d.category ? categoryColorMap[d.category] || "#0f4c81" : "#d5deea"}`,
              background: selectedCategory === d.category ? categoryColorMap[d.category] || "#0f4c81" : "#ffffff",
              color: selectedCategory === d.category ? "#ffffff" : categoryColorMap[d.category] || "#334155",
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: selectedCategory === d.category ? 600 : 500,
              boxShadow: selectedCategory === d.category ? "0 2px 6px rgba(15, 23, 42, 0.16)" : "none",
              letterSpacing: "0.015em",
            }}
          >
            {d.category}
          </button>
        ))}
      </div>
      {selectedCategory && (
        <div
          style={{
            textAlign: "center",
            marginBottom: "8px",
            color: "#334155",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}
        >
          {selectedCategory} · Avg automation risk:{" "}
          {(jobDensityData.find((d) => d.category === selectedCategory)?.risk || 0).toFixed(1)}%
        </div>
      )}

      <svg ref={segmentedSvgRef} style={{ width: "100%", height: "auto", display: "block" }}></svg>

      <div
        ref={segmentedTooltipRef}
        style={{
          position: "absolute",
          opacity: 0,
          backgroundColor: "white",
          border: "1px solid #d6dfeb",
          padding: "8px",
          borderRadius: "8px",
          pointerEvents: "none",
          fontSize: "12px",
          textAlign: "left",
          boxShadow: "0px 8px 20px rgba(15,23,42,0.10)",
          zIndex: 10,
        }}
      ></div>
    </div>
  );
}

export { AiHeatmap, AiJobCount };
