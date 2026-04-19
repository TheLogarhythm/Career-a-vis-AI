import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./IndustryDashboard.css";

const IndustryDashboard = () => {
  const chartRef = useRef(null);
  const [data, setData] = useState([]);
  const [selectedIndustries, setSelectedIndustries] = useState(["Market Average"]);

  const width = 500;
  const height = 500;
  const radius = 180;
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10);
  const AVG_COLOR = "#94a3b8";

  const metrics = [
    { key: "salary_usd", title: "Avg Salary" },
    { key: "ai_intensity_score", title: "AI Intensity" },
    { key: "automation_risk_score", title: "Automation Risk" },
    { key: "reskilling_rate", title: "Reskilling Demand" },
    { key: "displacement_risk", title: "Displacement Risk" },
    { key: "skill_complexity", title: "Skill Variety" }
  ];

  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    d3.csv(`${baseUrl}ai_impact_jobs_2010_2025.csv`).then((raw) => {
      const riskMap = { Low: 0.33, Medium: 0.66, High: 1.0 };
      
      const rolled = d3.rollups(raw, (v) => ({
          salary_usd: d3.mean(v, d => +d.salary_usd),
          ai_intensity_score: d3.mean(v, d => +d.ai_intensity_score),
          automation_risk_score: d3.mean(v, d => +d.automation_risk_score),
          reskilling_rate: d3.mean(v, d => (d.reskilling_required === "True" ? 1 : 0)) * 100,
          displacement_risk: d3.mean(v, d => riskMap[d.ai_job_displacement_risk] || 0),
          skill_complexity: d3.mean(v, d => d.ai_skills ? d.ai_skills.split(",").length : 0)
        }), (d) => d.industry
      );

      let stats = rolled.map(([industry, values]) => ({ industry, ...values }));

      // Market Average Calculation
      const marketAvg = { industry: "Market Average" };
      metrics.forEach(m => {
        marketAvg[m.key] = d3.mean(stats, s => s[m.key]);
      });
      
      const combinedStats = [marketAvg, ...stats];

      // Normalization
      const normalized = combinedStats.map((d) => {
        const norm = { ...d };
        metrics.forEach((m) => {
          const maxVal = d3.max(combinedStats, (s) => s[m.key]) || 1;
          norm[`${m.key}_norm`] = d[m.key] / maxVal;
        });
        return norm;
      });

      setData(normalized);
    });
  }, []);

  useEffect(() => {
    if (!data.length || !chartRef.current) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove(); // Clear previous draw

    const g = svg.append("g")
                 .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const angleSlice = (Math.PI * 2) / metrics.length;
    const rScale = d3.scaleLinear().domain([0, 1]).range([0, radius]);

    // 1. Draw Grid
    [0.2, 0.4, 0.6, 0.8, 1.0].forEach(level => {
      const gridPoints = metrics.map((_, i) => {
        const r = rScale(level);
        return [r * Math.cos(angleSlice * i - Math.PI / 2), r * Math.sin(angleSlice * i - Math.PI / 2)];
      });
      g.append("polygon")
       .attr("points", gridPoints.join(" "))
       .attr("fill", "none")
       .attr("stroke", "#f1f5f9");
    });

    // 2. Labels
    metrics.forEach((m, i) => {
      const x = rScale(1.15) * Math.cos(angleSlice * i - Math.PI / 2);
      const y = rScale(1.15) * Math.sin(angleSlice * i - Math.PI / 2);
      g.append("text")
       .attr("x", x).attr("y", y)
       .attr("text-anchor", "middle")
       .attr("fill", "#94a3b8")
       .style("font-size", "11px")
       .style("font-weight", "600")
       .text(m.title);
    });

    // 3. Draw Industry Shapes
    selectedIndustries.forEach((name) => {
      const industryData = data.find(d => d.industry === name);
      if (!industryData) return;

      const isAvg = name === "Market Average";
      const color = isAvg ? AVG_COLOR : colorScale(name);

      const radarLine = d3.lineRadial()
        .radius(d => rScale(industryData[`${d.key}_norm`]))
        .angle((d, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);

      g.append("path")
        .datum(metrics)
        .attr("d", radarLine)
        .attr("fill", color)
        .attr("fill-opacity", isAvg ? 0.05 : 0.15)
        .attr("stroke", color)
        .attr("stroke-width", isAvg ? 1.5 : 2.5)
        .attr("stroke-dasharray", isAvg ? "4,4" : "0");

      metrics.forEach((m, i) => {
        g.append("circle")
          .attr("r", isAvg ? 3 : 4.5)
          .attr("cx", rScale(industryData[`${m.key}_norm`]) * Math.cos(angleSlice * i - Math.PI / 2))
          .attr("cy", rScale(industryData[`${m.key}_norm`]) * Math.sin(angleSlice * i - Math.PI / 2))
          .attr("fill", color)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5);
      });
    });
  }, [data, selectedIndustries]);

  const toggleIndustry = (industry) => {
    setSelectedIndustries(prev => 
      prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
    );
  };

  return (
    <div className="dashboard-container">
      <div className="industry-topbar">
        {data.map((d) => {
          const isActive = selectedIndustries.includes(d.industry);
          const color = d.industry === "Market Average" ? AVG_COLOR : colorScale(d.industry);
          return (
            <button
              key={d.industry}
              onClick={() => toggleIndustry(d.industry)}
              className="industry-btn"
              style={{
                borderColor: isActive ? color : "#e2e8f0",
                color: isActive ? color : "#64748b",
                backgroundColor: isActive ? `${color}10` : "white"
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: isActive ? color : "#cbd5e1" }} />
              {d.industry}
            </button>
          );
        })}
      </div>
      <div className="chart-area">
        <div className="chart-card">
          <svg ref={chartRef} width={width} height={height}></svg>
        </div>
      </div>
    </div>
  );
};

export default IndustryDashboard;
