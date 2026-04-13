import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

function SalaryLinechart() {
  const chartRef = useRef();
  const [data, setData] = useState([]);

  const margin = { top: 60, right: 150, bottom: 50, left: 80 };
  const width = 900 - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;

  useEffect(() => {
    d3.csv("/ai_impact_jobs_2010_2025.csv").then((raw) => {
      const grouped = d3.groups(raw, d => d.ai_mentioned === "True");

      const seriesData = grouped.map(([isAI, values]) => {
        const annualAvg = d3.groups(values, d => +d.posting_year)
          .map(([year, v]) => ({
            year: year,
            salary: d3.mean(v, d => +d.salary_usd)
          }))
          .sort((a, b) => a.year - b.year);

        return {
          label: isAI ? "AI Jobs" : "Non-AI Jobs",
          color: isAI ? "#1DD3B0" : "#FF6B6B",
          values: annualAvg
        };
      });

      setData(seriesData);
    });
  }, []);

  useEffect(() => {
    if (data.length === 0) return;

    const container = d3.select(chartRef.current);
    container.selectAll("*").remove(); // Clear previous render

    const svg = container.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain(d3.extent(data[0].values, d => d.year))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([
        d3.min(data, s => d3.min(s.values, v => v.salary)) * 0.9,
        d3.max(data, s => d3.max(s.values, v => v.salary)) * 1.1
      ])
      .range([height, 0]);

    svg.append("g")
      .attr("class", "grid")
      .attr("color", "#eee")
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));

    svg.append("g")
      .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("$,.0f")));

    const lineGen = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.salary))
      .curve(d3.curveMonotoneX);

    data.forEach((s) => {
      svg.append("path")
        .datum(s.values)
        .attr("fill", "none")
        .attr("stroke", s.color)
        .attr("stroke-width", 3)
        .attr("d", lineGen);

      svg.selectAll(`.dot-${s.label.replace(/\s/g, '')}`)
        .data(s.values)
        .enter().append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.salary))
        .attr("r", 5)
        .attr("fill", s.color)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);
    });

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text("💰 Salary Trends: AI vs Non-AI Jobs");

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Year");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -60)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Average Salary (USD)");

    const legend = svg.append("g")
      .attr("transform", `translate(${width + 20}, 20)`);

    data.forEach((s, i) => {
      const g = legend.append("g")
        .attr("transform", `translate(0, ${i * 25})`);
      
      g.append("rect").attr("width", 15).attr("height", 15).attr("fill", s.color).attr("rx", 3);
      g.append("text").attr("x", 25).attr("y", 12).style("font-size", "12px").text(s.label);
    });

  }, [data]);

  return (
    <div style={{ padding: "20px", background: "white", borderRadius: "12px" }}>
      <div ref={chartRef}></div>
    </div>
  );
}

export default SalaryLinechart;
