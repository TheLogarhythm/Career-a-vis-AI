import React, { useEffect, useState, useMemo, useRef } from "react";
import * as d3 from "d3";
import SeniorityDashboard from "./SeniorityDashboard";
import { dbUrl } from "../utils/paths";

export function DraggablePie({ weights, setWeights }) {
  const svgRef = useRef(null);
  // We store the current "angles" in a ref to keep interaction smooth
  const anglesRef = useRef([]);
  const metrics = useMemo(() => Object.keys(weights || {}), [weights]);
  const colors = ["#3498db", "#2ecc71", "#e74c3c", "#f39c12", "#9b59b6", "#1abc9c"];
  const radius = 85;
  const padding = 30;

  // Initialize angles equally (e.g., 60 degrees each for 6 metrics)
  useEffect(() => {
    const total = d3.sum(Object.values(weights));
    let cumulative = 0;
    anglesRef.current = metrics.map((m) => {
      const share = (weights[m] / total) * (Math.PI * 2);
      cumulative += share;
      return cumulative;
    });
  }, [metrics, weights]);

  useEffect(() => {
    if (!svgRef.current || metrics.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const g = svg.append("g").attr("transform", `translate(${radius + padding},${radius + padding})`);

    const arcGen = d3.arc().innerRadius(0).outerRadius(radius);

    const render = (angles) => {
      // Convert boundary angles back into pie data format
      const pieData = angles.map((angle, i) => {
        const startAngle = i === 0 ? 0 : angles[i - 1];
        return { startAngle, endAngle: angle, index: i };
      });

      // 1. Draw Slices
      g.selectAll(".slice")
        .data(pieData)
        .join("path")
        .attr("class", "slice")
        .attr("d", arcGen)
        .attr("fill", (d, i) => colors[i % colors.length])
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

      // 2. Draw Handles on the dividers
      g.selectAll(".handle")
        .data(angles)
        .join("circle")
        .attr("class", "handle")
        .attr("r", 9)
        .attr("cx", (d) => radius * Math.sin(d))
        .attr("cy", (d) => -radius * Math.cos(d))
        .attr("fill", "#fff")
        .attr("stroke", "#cbd5e1")
        .attr("stroke-width", 2)
        .style("cursor", "crosshair")
        .style("filter", "drop-shadow(0px 2px 3px rgba(0,0,0,0.15))");
    };

    render(anglesRef.current);

    const drag = d3
      .drag()
      .on("drag", (event) => {
        const [x, y] = [event.x - (radius + padding), event.y - (radius + padding)];
        let angle = Math.atan2(x, -y);
        if (angle < 0) angle += Math.PI * 2;

        // Find which handle (divider) is closest to the drag point
        let closestIdx = 0;
        let minDist = Infinity;
        anglesRef.current.forEach((a, i) => {
          // We don't drag the very last handle to keep the circle closed
          if (i === anglesRef.current.length - 1) return;
          const d = Math.abs(a - angle);
          if (d < minDist) {
            minDist = d;
            closestIdx = i;
          }
        });

        // Constraint: Don't let a divider cross its neighbors (min 5 degree slice)
        const minGap = 0.1;
        const prev = closestIdx === 0 ? 0 : anglesRef.current[closestIdx - 1];
        const next = anglesRef.current[closestIdx + 1];

        if (angle > prev + minGap && angle < next - minGap) {
          anglesRef.current[closestIdx] = angle;
          render(anglesRef.current);
        }
      })
      .on("end", () => {
        // Convert angles back to weights for the Radar
        const newWeights = {};
        anglesRef.current.forEach((angle, i) => {
          const start = i === 0 ? 0 : anglesRef.current[i - 1];
          const span = angle - start;
          newWeights[metrics[i]] = span;
        });
        setWeights(newWeights);
      });

    svg.call(drag);
  }, [metrics, setWeights]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg
        ref={svgRef}
        width={(radius + padding) * 2}
        height={(radius + padding) * 2}
        style={{ touchAction: "none", overflow: "visible" }}
      />

      <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
        {metrics.map((m, i) => (
          <div key={m} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors[i % colors.length] }} />
            <span style={{ fontSize: "10px", color: "#475569", fontWeight: "bold" }}>
              {m.replace(/_/g, " ").replace(" score", "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 2. MAIN RADAR COMPONENT
 */
function Radar({ scrollParentRef }) {
  const [industryData, setIndustryData] = useState([]);
  const [regionData, setRegionData] = useState([]);
  const [selectedIndustries, setSelectedIndustries] = useState(["Market Average"]);
  const [selectedRegions, setSelectedRegions] = useState(["Market Average"]);
  const [mergeFactor, setMergeFactor] = useState(0);
  const stickyRef = useRef(null);

  // Define metrics locally since weights are removed
  const metricsList = [
    "salary_usd",
    "ai_intensity_score",
    "automation_risk_score",
    "reskilling_rate",
    "displacement_risk",
    "skill_complexity",
  ];

  // Initialize active metrics state for legend toggling
  const [activeMetrics] = useState(metricsList.reduce((acc, key) => ({ ...acc, [key]: true }), {}));

  // Helper: Geometric Area Calculation (No weighting)
  const calculateArea = (d, currentActive) => {
    const angleSlice = (Math.PI * 2) / metricsList.length;
    let area = 0;
    for (let i = 0; i < metricsList.length; i++) {
      const m1 = metricsList[i];
      const m2 = metricsList[(i + 1) % metricsList.length];
      const r1 = currentActive[m1] ? d[`${m1}_norm`] || 0 : 0;
      const r2 = currentActive[m2] ? d[`${m2}_norm`] || 0 : 0;
      area += 0.5 * r1 * r2 * Math.sin(angleSlice);
    }
    return area;
  };

  useEffect(() => {
    d3.csv(dbUrl("ai_impact_jobs_2010_2025.csv")).then((raw) => {
      const riskMap = { Low: 0.33, Medium: 0.66, High: 1.0 };
      const processGroup = (dimension) => {
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
          (d) => d[dimension],
        );

        let stats = rolled.map(([k, v]) => ({ industry: k, ...v }));
        const marketAvg = { industry: "Market Average" };
        metricsList.forEach((key) => (marketAvg[key] = d3.mean(stats, (s) => s[key])));

        return [marketAvg, ...stats].map((d) => {
          const norm = { ...d };
          metricsList.forEach((key) => {
            const maxVal = d3.max([marketAvg, ...stats], (s) => s[key]) || 1;
            norm[`${key}_norm`] = d[key] / maxVal;
          });
          return norm;
        });
      };
      setIndustryData(processGroup("industry"));
      setRegionData(processGroup("region"));
    });
  }, []);

  const getProcessedData = (dataset) => {
    return dataset.map((d) => {
      const entry = { ...d };
      metricsList.forEach((m) => {
        entry[`${m}_norm`] = activeMetrics[m] ? d[`${m}_norm`] || 0 : 0;
      });
      return entry;
    });
  };

  const handleAutoSelect = () => {
    if (industryData.length === 0 || regionData.length === 0) return;
    const findTop = (data) =>
      data
        .filter((d) => d.industry !== "Market Average")
        .reduce((prev, curr) => (calculateArea(prev, activeMetrics) > calculateArea(curr, activeMetrics) ? prev : curr))
        .industry;

    setSelectedIndustries(["Market Average", findTop(industryData)]);
    setSelectedRegions(["Market Average", findTop(regionData)]);
  };

  const processedInd = useMemo(() => getProcessedData(industryData), [industryData, activeMetrics]);
  const processedReg = useMemo(() => getProcessedData(regionData), [regionData, activeMetrics]);

  useEffect(() => {
    const handleScroll = () => {
      if (!stickyRef.current) return;
      const rect = stickyRef.current.getBoundingClientRect();
      const progress = Math.min(Math.max(-rect.top / window.innerHeight, 0), 1);
      setMergeFactor(progress < 0.2 ? 0 : (progress - 0.2) / 0.8);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  const industryColorScale = useMemo(() => d3.scaleOrdinal(d3.schemeTableau10), []);
  const regionColorScale = useMemo(() => d3.scaleOrdinal(d3.schemeSet3), []);

  const btnStyle = (active, color) => ({
    padding: "4px 10px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "11px",
    border: `2px solid ${active ? color : "#e2e8f0"}`,
    background: active ? "white" : "#f8fafc",
    color: active ? color : "#64748b",
    margin: "2px",
  });

  return (
    <div style={{ background: "#f8fafc", fontFamily: "sans-serif" }}>
      <div style={{ height: "250vh", position: "relative" }} ref={stickyRef}>
        <div
          style={{
            position: "sticky",
            top: "0",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "white",
            overflow: "hidden",
            paddingTop: "40px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "#1e293b", margin: 0 }}>Comparative AI Profile</h2>
            <button
              onClick={handleAutoSelect}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Show largest Area
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "20px",
              width: "90%",
              maxWidth: "1000px",
              background: "white",
              padding: "15px",
              borderRadius: "16px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              zIndex: 10,
            }}
          >
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
                {industryData.map((d) => (
                  <button
                    key={d.industry}
                    onClick={() => setSelectedIndustries(["Market Average", d.industry])}
                    style={btnStyle(selectedIndustries.includes(d.industry), industryColorScale(d.industry))}
                  >
                    {d.industry}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
                {regionData.map((d) => (
                  <button
                    key={d.industry}
                    onClick={() => setSelectedRegions(["Market Average", d.industry])}
                    style={btnStyle(selectedRegions.includes(d.industry), regionColorScale(d.industry))}
                  >
                    {d.industry}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              position: "relative",
              marginTop: "20px",
            }}
          >
            <div style={{ transform: `translateX(${mergeFactor * 250}px)`, zIndex: 2 }}>
              <SeniorityDashboard
                data={processedInd}
                selectedIndustries={selectedIndustries}
                colorScale={industryColorScale}
                transparent={true}
              />
            </div>
            <div
              style={{
                transform: `translateX(-${mergeFactor * 250}px)`,
                mixBlendMode: "multiply",
                zIndex: 3,
                pointerEvents: "none",
              }}
            >
              <SeniorityDashboard
                data={processedReg}
                selectedIndustries={selectedRegions}
                colorScale={regionColorScale}
                transparent={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Radar;
