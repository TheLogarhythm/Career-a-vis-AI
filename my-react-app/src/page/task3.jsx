import React, { useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import SeniorityDashboard from "./task3_charts/task3-SeniorityDashboard";
import Linechart from "./task3_charts/task3-linechart";

function Task3({ scrollParentRef }) {
  const [data, setData] = useState([]);
  const [selectedIndustries, setSelectedIndustries] = useState(["Market Average"]);
  const [selectedIndustryLine, setSelectedIndustryLine] = useState("Market Average");

  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    d3.csv(`${baseUrl}ai_impact_jobs_2010_2025.csv`).then((raw) => {
      const riskMap = { Low: 0.33, Medium: 0.66, High: 1.0 };
      const metrics = ["salary_usd", "ai_intensity_score", "automation_risk_score", "reskilling_rate", "displacement_risk", "skill_complexity"];
      
      const rolled = d3.rollups(raw, (v) => ({
        salary_usd: d3.mean(v, d => +d.salary_usd),
        ai_intensity_score: d3.mean(v, d => +d.ai_intensity_score),
        automation_risk_score: d3.mean(v, d => +d.automation_risk_score),
        reskilling_rate: d3.mean(v, d => (d.reskilling_required === "True" ? 1 : 0)) * 100,
        displacement_risk: d3.mean(v, d => riskMap[d.ai_job_displacement_risk] || 0),
        skill_complexity: d3.mean(v, d => d.ai_skills ? d.ai_skills.split(",").length : 0)
      }), (d) => d.industry);

      let stats = rolled
        .map(([industry, values]) => ({ industry, ...values }))
        .sort((a, b) => a.industry.localeCompare(b.industry));

      const marketAvg = { industry: "Market Average" };
      metrics.forEach(key => marketAvg[key] = d3.mean(stats, s => s[key]));
      
      const combined = [marketAvg, ...stats].map(d => {
        const norm = { ...d };
        metrics.forEach(key => {
          const maxVal = d3.max([marketAvg, ...stats], s => s[key]) || 1;
          norm[`${key}_norm`] = d[key] / maxVal;
        });
        return norm;
      });
      setData(combined);
    });
  }, []);

  const colorScale = useMemo(() => {
    const industryNames = data.filter(d => d.industry !== "Market Average").map(d => d.industry);
    return d3.scaleOrdinal().domain(industryNames).range(d3.schemeTableau10);
  }, [data]);

  const toggleIndustryMulti = (industry) => {
    setSelectedIndustries(prev => 
      prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
    );
  };

  const handleReset = () => setSelectedIndustries(["Market Average"]);

  return (
    <div className="task3-container" style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>AI Impact Analysis</h2>

      {/* --- SECTION 1: RADAR CHART (MULTI-SELECT) --- */}
      <h4 style={{ textAlign: "center", color: "#64748b" }}>Industry Profile Comparison (Radar)</h4>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginBottom: "20px" }}>
        <button 
          onClick={handleReset}
          style={{ padding: "8px 16px", borderRadius: "20px", border: "2px solid #ef4444", background: "white", color: "#ef4444", cursor: "pointer", fontWeight: "bold" }}
        >
          Reset
        </button>

        {data.map((d) => {
          const isSelected = selectedIndustries.includes(d.industry);
          const color = d.industry === "Market Average" ? "#94a3b8" : colorScale(d.industry);
          return (
            <button
              key={`radar-btn-${d.industry}`}
              onClick={() => toggleIndustryMulti(d.industry)}
              style={{
                padding: "8px 16px", borderRadius: "20px", cursor: "pointer", transition: "all 0.2s",
                border: `2px solid ${isSelected ? color : "#e2e8f0"}`,
                background: isSelected ? "white" : "#f8fafc",
                color: isSelected ? color : "#64748b",
              }}
            >
              {d.industry}
            </button>
          );
        })}
      </div>

      <SeniorityDashboard data={data} selectedIndustries={selectedIndustries} colorScale={colorScale} />

      <hr style={{ margin: "50px 0", border: "0", borderTop: "1px solid #e2e8f0" }} />

      {/* --- SECTION 2: LINE CHART (SINGLE-SELECT) --- */}
      <h4 style={{ textAlign: "center", color: "#64748b" }}>Historical Trend Analysis (Line)</h4>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginBottom: "20px" }}>
        {data.map((d) => {
          const isSelected = selectedIndustryLine === d.industry;
          const color = d.industry === "Market Average" ? "#3498db" : colorScale(d.industry);
          return (
            <button
              key={`line-btn-${d.industry}`}
              onClick={() => setSelectedIndustryLine(d.industry)}
              style={{
                padding: "8px 16px", borderRadius: "20px", cursor: "pointer", transition: "all 0.2s",
                border: `2px solid ${isSelected ? color : "#e2e8f0"}`,
                background: isSelected ? "white" : "#f8fafc",
                color: isSelected ? color : "#64748b",
              }}
            >
              {d.industry}
            </button>
          );
        })}
      </div>

      <Linechart 
        scrollParentRef={scrollParentRef}
        selectedIndustries={selectedIndustries} // The Array (Multi-select)
        selectedIndustry={selectedIndustryLine}  // The String (Single-select)
        colorScale={colorScale}
      />
    </div>
  );
}

export default Task3;
