import React, { useState, useEffect } from "react";
import "../styles/SummaryStats.css";
import DetailedDistribution from "./DetailedDistribution";

function SummaryStats({ selectedTask }) {
  const [stats, setStats] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [rawData, setRawData] = useState(null);

  useEffect(() => {
    loadStats();
  }, [selectedTask]);

  const parseCSV = (text) => {
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || "";
      });
      data.push(row);
    }
    return data;
  };

  const loadStats = async () => {
    try {
      const filePath = import.meta.env.BASE_URL + "ai_impact_jobs_2010_2025.csv";

      const response = await fetch(filePath);
      const text = await response.text();
      const data = parseCSV(text);
      setRawData(data);

      // Calculate statistics
      const totalJobs = data.length;
      const countries = [...new Set(data.map((d) => d.country))].length;

      const avgAiIntensity = (
        (data.reduce((sum, d) => sum + (parseFloat(d.ai_intensity_score) || 0), 0) / totalJobs) *
        100
      ).toFixed(1);

      const avgAutomationRisk = (
        (data.reduce((sum, d) => sum + (parseFloat(d.automation_risk_score) || 0), 0) / totalJobs) *
        100
      ).toFixed(1);

      // Count displacement risk levels
      const riskCounts = {
        High: data.filter((d) => d.ai_job_displacement_risk === "High").length,
        Medium: data.filter((d) => d.ai_job_displacement_risk === "Medium").length,
        Low: data.filter((d) => d.ai_job_displacement_risk === "Low").length,
      };
      const highRiskPercentage = ((riskCounts.High / totalJobs) * 100).toFixed(1);

      setStats({
        totalJobs: totalJobs.toLocaleString(),
        countries,
        avgAiIntensity,
        avgAutomationRisk,
        highRiskPercentage,
        riskCounts,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats({
        totalJobs: "N/A",
        countries: "N/A",
        avgAiIntensity: "N/A",
        avgAutomationRisk: "N/A",
        highRiskPercentage: "N/A",
        riskCounts: {},
      });
    }
  };

  if (!stats) {
    return <div className="summary-stats loading">Loading...</div>;
  }

  // Show detailed distribution when a metric is selected
  if (selectedMetric && rawData) {
    return <DetailedDistribution metric={selectedMetric} data={rawData} onClose={() => setSelectedMetric(null)} />;
  }

  return (
    <div className="summary-stats-container">
      <div className="summary-stats">
        <div className="stat-card" onClick={() => setSelectedMetric("country")}>
          <div className="stat-label">Regional Distribution</div>
          <div className="stat-value">{stats.countries}</div>
          <div className="stat-unit">Countries</div>
        </div>

        <div className="stat-card" onClick={() => setSelectedMetric("ai_intensity")}>
          <div className="stat-label">AI Intensity</div>
          <div className="stat-value">{stats.avgAiIntensity}%</div>
          <div className="stat-unit">Average</div>
        </div>

        <div className="stat-card" onClick={() => setSelectedMetric("automation_risk")}>
          <div className="stat-label">Automation Risk</div>
          <div className="stat-value">{stats.avgAutomationRisk}%</div>
          <div className="stat-unit">Average</div>
        </div>

        <div className="stat-card" onClick={() => setSelectedMetric("displacement_risk")}>
          <div className="stat-label">High Risk Jobs</div>
          <div className="stat-value">{stats.highRiskPercentage}%</div>
          <div className="stat-unit">Percentage</div>
        </div>
      </div>
      <div className="stat-hint">💡 Click any card for detailed distribution</div>
    </div>
  );
}

export default SummaryStats;
