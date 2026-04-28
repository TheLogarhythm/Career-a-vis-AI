import React, { useState, useEffect, useMemo } from "react";
import * as d3 from "d3";
import { motion, AnimatePresence } from "framer-motion"; // Add this

const WeightedBarChart = ({ weights, activeMetrics }) => {
  const [industryData, setIndustryData] = useState([]);
  const [regionData, setRegionData] = useState([]);
  const metrics = Object.keys(weights);

  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    d3.csv(`${baseUrl}ai_impact_jobs_2010_2025.csv`).then((raw) => {
      const riskMap = { Low: 0.33, Medium: 0.66, High: 1.0 };
      const process = (dim) => {
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
          (d) => d[dim],
        );
        const stats = rolled.map(([k, v]) => ({ industry: k, ...v }));
        return stats.map((d) => {
          const norm = { ...d };
          metrics.forEach((m) => {
            const maxVal = d3.max(stats, (s) => s[m]) || 1;
            norm[`${m}_norm`] = d[m] / maxVal;
          });
          return norm;
        });
      };
      setIndustryData(process("industry"));
      setRegionData(process("region"));
    });
  }, []);

  const calculateScore = (d) => {
    let weightedSum = 0,
      totalWeight = 0;
    metrics.forEach((m) => {
      if (activeMetrics[m]) {
        weightedSum += (d[`${m}_norm`] || 0) * weights[m];
        totalWeight += weights[m];
      }
    });
    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  };

  const indScores = useMemo(
    () =>
      industryData
        .map((d) => ({ id: d.industry, label: d.industry, score: calculateScore(d) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8),
    [industryData, weights, activeMetrics],
  );

  const regScores = useMemo(
    () =>
      regionData
        .map((d) => ({ id: d.industry, label: d.industry, score: calculateScore(d) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8),
    [regionData, weights, activeMetrics],
  );

  const BarGroup = ({ data, title, color }) => (
    <div
      style={{
        flex: 1,
        padding: "20px",
        background: "rgba(255, 255, 255, 0.6)",
        borderRadius: "16px",
        border: "1px solid rgba(226, 232, 240, 0.8)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.05)",
      }}
    >
      <h4
        style={{
          margin: "0 0 20px 0",
          color: "#1e293b",
          fontSize: "14px",
          fontWeight: "700",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h4>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {data.map((item) => (
          <div key={item.id} style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px",
                marginBottom: "6px",
              }}
            >
              <span style={{ color: "#475569", fontWeight: "600" }}>{item.label}</span>
              <span
                style={{
                  color: color,
                  fontWeight: "800",
                  background: `${color}15`,
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                {item.score.toFixed(1)}
              </span>
            </div>

            <div
              style={{
                height: "10px",
                background: "#f1f5f9",
                borderRadius: "5px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: color,
                  borderRadius: "5px",
                  width: `${item.score}%`, // Static width update
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: "20px", marginTop: "20px", width: "100%" }}>
      <BarGroup data={indScores} title="Industry Intensity Index" color="#3b82f6" />
      <BarGroup data={regScores} title="Regional Intensity Index" color="#10b981" />
    </div>
  );
};

export default WeightedBarChart;
