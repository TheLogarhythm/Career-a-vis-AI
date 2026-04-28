import React, { useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import Task3Linechart from "./Task3Linechart";
import { dbUrl } from "../utils/paths";

type LinechartSectionProps = {
  scrollParentRef?: React.RefObject<HTMLElement>;
};

function LinechartSection({ scrollParentRef }: LinechartSectionProps) {
  const [industryData, setIndustryData] = useState([]);
  const [selectedIndustryLine, setSelectedIndustryLine] = useState("Market Average");

  useEffect(() => {
    d3.csv(dbUrl("ai_impact_jobs_2010_2025.csv")).then((raw) => {
      const riskMap = { Low: 0.33, Medium: 0.66, High: 1.0 };
      const metrics = [
        "salary_usd",
        "ai_intensity_score",
        "automation_risk_score",
        "reskilling_rate",
        "displacement_risk",
        "skill_complexity",
      ];

      const processGroup = (dimension: string) => {
        const rolled = d3.rollups(
          raw,
          (v) => ({
            salary_usd: d3.mean(v, (d) => +d.salary_usd),
            ai_intensity_score: d3.mean(v, (d) => +d.ai_intensity_score),
            automation_risk_score: d3.mean(v, (d) => +d.automation_risk_score),
            reskilling_rate: d3.mean(v, (d) => (d.reskilling_required === "True" ? 1 : 0)) * 100,
            displacement_risk: d3.mean(v, (d) => riskMap[d.ai_job_displacement_risk] || 0),
            skill_complexity: d3.mean(v, (d) => (d.ai_skills ? d.ai_skills.split(",").length : 0)),
          }),
          (d) => d[dimension as keyof typeof d],
        );

        const stats = rolled
          .map(([dimValue, values]) => ({ industry: dimValue, ...values }))
          .sort((a, b) => String(a.industry).localeCompare(String(b.industry)));

        const marketAvg: Record<string, number | string> = { industry: "Market Average" };
        metrics.forEach((key) => (marketAvg[key] = d3.mean(stats, (s) => s[key])));

        return [marketAvg, ...stats].map((d) => {
          const norm = { ...d };
          metrics.forEach((key) => {
            const maxVal = d3.max([marketAvg, ...stats], (s) => s[key]) || 1;
            norm[`${key}_norm`] = d[key] / maxVal;
          });
          return norm;
        });
      };

      setIndustryData(processGroup("industry"));
    });
  }, []);

  const industryColorScale = useMemo(() => {
    const names = industryData.filter((d) => d.industry !== "Market Average").map((d) => d.industry);
    return d3.scaleOrdinal().domain(names).range(d3.schemeTableau10);
  }, [industryData]);

  const btnStyle = (active: boolean, color: string) => ({
    padding: "4px 10px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "11px",
    transition: "all 0.2s",
    border: `2px solid ${active ? color : "#e2e8f0"}`,
    background: active ? "white" : "#f8fafc",
    color: active ? color : "#64748b",
    margin: "2px",
  });

  return (
    <div style={{ background: "#f8fafc", fontFamily: "sans-serif" }}>
      <div style={{ background: "white", padding: "40px", position: "relative", zIndex: 20 }}>
        <h3 style={{ textAlign: "center", color: "#1e293b", marginBottom: "20px" }}>Historical Trend Analysis</h3>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: "30px",
            maxWidth: "900px",
            margin: "0 auto 30px",
          }}
        >
          {industryData.map((d) => {
            const isActive = selectedIndustryLine === d.industry;
            const btnColor = d.industry === "Market Average" ? "#3498db" : industryColorScale(d.industry);
            return (
              <button
                key={`line-btn-${d.industry}`}
                onClick={() => setSelectedIndustryLine(d.industry)}
                style={btnStyle(isActive, btnColor)}
              >
                {d.industry}
              </button>
            );
          })}
        </div>

        <Task3Linechart scrollParentRef={scrollParentRef} selectedIndustry={selectedIndustryLine} />
      </div>
    </div>
  );
}

export default LinechartSection;
