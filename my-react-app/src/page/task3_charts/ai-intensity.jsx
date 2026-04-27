import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";

// ─── Part 1: Heatmap ────────────────────────────────────────
function AiHeatmap() {
  const [data, setData] = useState([]);
  const [intensityThreshold, setIntensityThreshold] = useState(0.5);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  const width = 800;
  const height = 480;
  const margin = { top: 60, right: 40, bottom: 100, left: 80 };

  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL || "/";

    d3.csv(`${baseUrl}ai_impact_jobs_2010_2025.csv`).then((raw) => {
      const parsedData = raw.map(d => ({
        industry: d.industry,
        salary: +d.salary_usd || 0,
        ai_intensity: +d.ai_intensity_score || 0,
      }));
      setData(parsedData);
    }).catch((error) => console.error(error));
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

    const industries = [...new Set(data.map(d => d.industry))];
    const gridRows = 15;

    const xScale = d3.scaleBand()
      .domain(industries)
      .range([0, innerWidth])
      .padding(0.05);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.salary) * 1.05])
      .range([innerHeight, 0]);

    const yMax = d3.max(data, d => d.salary) * 1.05;
    const yStep = yMax / gridRows;

    const gridData = [];
    industries.forEach((ind) => {
      for (let j = 0; j < gridRows; j++) {
        const yMin = j * yStep;
        const yMaxVal = (j + 1) * yStep;

        const pointsInBin = data.filter(d =>
          d.industry === ind &&
          d.salary >= yMin && d.salary < yMaxVal
        );

        if (pointsInBin.length > 0) {
          const avgIntensity = d3.mean(pointsInBin, d => d.ai_intensity);

          gridData.push({
            industry: ind,
            yIndex: j,
            count: pointsInBin.length,
            avgIntensity: avgIntensity,
          });
        }
      }
    });

    const maxCount = d3.max(gridData, d => d.count) || 1;

    const colorScale = d3.scaleSequential()
      .domain([0, maxCount])
      .interpolator(d3.interpolateBlues);

    mainGroup.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-35)")
      .style("text-anchor", "end")
      .style("font-size", "11px");

    mainGroup.append("g")
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

    mainGroup.selectAll(".bin")
      .data(gridData)
      .enter()
      .append("rect")
      .attr("class", "bin")
      .attr("x", d => xScale(d.industry))
      .attr("y", d => innerHeight - (d.yIndex + 1) * blockHeight)
      .attr("width", blockWidth)
      .attr("height", blockHeight - 1)
      .attr("fill", d => colorScale(d.count))
      .style("opacity", d => d.avgIntensity >= intensityThreshold ? 1 : 0.05)
      .style("stroke", "#fff")
      .style("stroke-width", "0.5px")
      .on("mouseover", function(event, d) {
        tooltip.style("opacity", 1);
        tooltip.html(`<strong>${d.industry}</strong><br/>Jobs: ${d.count}<br/>Avg Intensity: ${d.avgIntensity.toFixed(2)}`);
        d3.select(this).style("stroke", "#000").style("stroke-width", "1.5px");
      })
      .on("mousemove", function(event) {
        const [x, y] = d3.pointer(event, svgRef.current);
        tooltip
          .style("left", `${x + 15}px`)
          .style("top", `${y + 15}px`);
      })
      .on("mouseout", function() {
        tooltip.style("opacity", 0);
        d3.select(this).style("stroke", "#fff").style("stroke-width", "0.5px");
      });

    const legendWidth = 200;
    const legendHeight = 10;

    const legendGroup = mainGroup.append("g")
      .attr("transform", `translate(${innerWidth - legendWidth - 100}, -30)`);

    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
      .attr("id", "blue-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");

    linearGradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(0));
    linearGradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxCount));

    legendGroup.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#blue-gradient)");

    legendGroup.append("text")
      .attr("x", -5)
      .attr("y", 9)
      .attr("text-anchor", "end")
      .style("font-size", "11px")
      .text("Low density (0 jobs)");

    legendGroup.append("text")
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
      .duration(200)
      .style("opacity", d => d.avgIntensity >= intensityThreshold ? 1 : 0.05);

  }, [intensityThreshold, data]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "980px", margin: "0 auto", textAlign: "center", fontFamily: "sans-serif" }}>
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
          zIndex: 10
        }}
      ></div>

      <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#f4f4f4", borderRadius: "8px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
          Highlight Blocks with Avg AI Intensity Above: <span style={{ color: "#007bff" }}>{intensityThreshold.toFixed(2)}</span>
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
  const [segmentedContainerWidth, setSegmentedContainerWidth] = useState(980);
  const segmentedSvgRef = useRef(null);
  const segmentedContainerRef = useRef(null);
  const segmentedTooltipRef = useRef(null);

  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    d3.csv(`${baseUrl}jobstreet_all_job_dataset.csv`).then((raw) => {
      const parsed = raw
        .map((d) => ({
          category: (d.category || "").trim(),
          subcategory: (d.subcategory || "").trim(),
        }))
        .filter((d) => d.category && d.subcategory);

      const categorySegments = d3
        .rollups(parsed, (v) => v.length, (d) => d.category, (d) => d.subcategory)
        .map(([category, subcategories]) => ({
          category,
          total: d3.sum(subcategories, ([, count]) => count),
          segments: subcategories
            .map(([subcategory, count]) => ({ subcategory, count }))
            .sort((a, b) => d3.descending(a.count, b.count)),
        }))
        .sort((a, b) => d3.descending(a.total, b.total));

      setJobDensityData(categorySegments);
    }).catch((error) => console.error(error));
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

    const segmentedWidth = Math.max(860, Math.floor(segmentedContainerWidth || 860));
    const segmentedHeight = Math.max(520, jobDensityData.length * 26 + 170);
    const segmentedMargin = { top: 50, right: 40, bottom: 45, left: 260 };

    const svg = d3.select(segmentedSvgRef.current);
    const tooltip = d3.select(segmentedTooltipRef.current);
    svg.selectAll("*").remove();

    const innerWidth = segmentedWidth - segmentedMargin.left - segmentedMargin.right;
    const innerHeight = segmentedHeight - segmentedMargin.top - segmentedMargin.bottom;

    const categoryColorScale = d3
      .scaleOrdinal()
      .domain(jobDensityData.map((d) => d.category))
      .range(
        jobDensityData.map((_, i) =>
          d3.interpolateTurbo(i / Math.max(jobDensityData.length - 1, 1))
        )
      );

    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(jobDensityData, (d) => d.total) || 0])
      .nice()
      .range([0, innerWidth]);

    const yScale = d3
      .scaleBand()
      .domain(jobDensityData.map((d) => d.category))
      .range([0, innerHeight])
      .padding(0.16);

    const colorBySegmentIndex = (baseColor, idx, totalSegments) => {
      const base = d3.hsl(baseColor);
      const ratio = totalSegments > 1 ? idx / (totalSegments - 1) : 0;
      const lightness = Math.min(0.88, base.l + ratio * 0.38);
      const saturation = Math.max(0.28, base.s - ratio * 0.25);
      return d3.hsl(base.h, saturation, lightness).formatHex();
    };

    const segmentData = jobDensityData.flatMap((categoryRow) => {
      const baseColor = categoryColorScale(categoryRow.category);
      let cumulative = 0;

      return categoryRow.segments.map((segment, idx) => {
        const start = cumulative;
        cumulative += segment.count;

        return {
          category: categoryRow.category,
          subcategory: segment.subcategory,
          segmentCount: segment.count,
          total: categoryRow.total,
          x0: start,
          x1: cumulative,
          color: colorBySegmentIndex(baseColor, idx, categoryRow.segments.length),
        };
      });
    });

    const mainGroup = svg
      .attr("width", segmentedWidth)
      .attr("height", segmentedHeight)
      .append("g")
      .attr("transform", `translate(${segmentedMargin.left},${segmentedMargin.top})`);

    mainGroup
      .append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", "11px")
      .attr("dominant-baseline", "middle")
      .attr("dy", "0");

    mainGroup
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.format(",")));

    mainGroup
      .selectAll(".category-segment")
      .data(segmentData)
      .enter()
      .append("rect")
      .attr("class", "category-segment")
      .attr("x", (d) => xScale(d.x0))
      .attr("y", (d) => yScale(d.category) || 0)
      .attr("width", (d) => Math.max(0, xScale(d.x1) - xScale(d.x0)))
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => d.color)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 0.8)
      .on("mouseover", function(event, d) {
        const percentage = d.total > 0 ? (d.segmentCount / d.total) * 100 : 0;
        tooltip.style("opacity", 1);
        tooltip.html(
          `<strong>${d.category}</strong><br/>Subcategory: ${d.subcategory}<br/>Jobs: ${d.segmentCount}<br/>Share: ${percentage.toFixed(1)}%`
        );
        d3.select(this).attr("stroke", "#111827").attr("stroke-width", 1.2);
      })
      .on("mousemove", function(event) {
        const [x, y] = d3.pointer(event, segmentedSvgRef.current);
        tooltip
          .style("left", `${x + 15}px`)
          .style("top", `${y + 15}px`);
      })
      .on("mouseout", function() {
        tooltip.style("opacity", 0);
        d3.select(this).attr("stroke", "#ffffff").attr("stroke-width", 0.8);
      });

    svg
      .attr("viewBox", `0 0 ${segmentedWidth} ${segmentedHeight}`)
      .attr("preserveAspectRatio", "xMinYMin meet");

  }, [jobDensityData, segmentedContainerWidth]);

  return (
    <div
      ref={segmentedContainerRef}
      style={{ position: "relative", width: "100%", maxWidth: "980px", margin: "0 auto", textAlign: "left", background: "#ffffff", borderRadius: "10px", overflowX: "hidden" }}
    >
      <h3 style={{ textAlign: "center", marginBottom: "6px" }}>Job Count by Category (Segmented by Subcategory)</h3>
      <p style={{ textAlign: "center", marginTop: 0, color: "#4b5563", fontSize: "12px" }}>
        Each horizontal bar is a category, and each segment represents its subcategory job count.
      </p>

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
          zIndex: 10
        }}
      ></div>
    </div>
  );
}

export { AiHeatmap, AiJobCount };
