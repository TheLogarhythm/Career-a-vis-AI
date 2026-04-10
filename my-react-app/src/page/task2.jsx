import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import "./task2.css";

// 配色方案
const INDUSTRY_COLORS = {
  Tech: "#dc2626",
  Finance: "#d97706",
  Healthcare: "#db2777",
  Education: "#0891b2",
  Manufacturing: "#7c3aed",
  Retail: "#ea580c",
  Agriculture: "#16a34a",
  Energy: "#0d9488",
  Government: "#f59e0b",
  default: "#64748b",
};

const MARGIN = { top: 60, right: 320, bottom: 100, left: 100 };
const WIDTH = 900 - MARGIN.left - MARGIN.right;
const HEIGHT = 550 - MARGIN.top - MARGIN.bottom;

const Task2 = () => {
  const svgRef = useRef(null);
  const [data, setData] = useState([]);
  const [currentYear, setCurrentYear] = useState(2010);
  const [selectedIndustries, setSelectedIndustries] = useState(new Set());
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [mode, setMode] = useState("timeflow");
  const [compareYears, setCompareYears] = useState({ left: 2010, right: 2024 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showGuide, setShowGuide] = useState(true);

  // 根据模式获取引导内容
  const getGuideContent = () => {
    if (mode === "timeflow") {
      return {
        title: "🕐 Timeflow Mode Guide",
        items: [
          {
            icon: "🎛️",
            title: "Mode Switcher (Top Left)",
            desc: "Switch between Timeflow (watch evolution) and Compare (side-by-side comparison) modes.",
          },
          {
            icon: "🎨",
            title: "Industry Filter (Right Side)",
            desc: "Click colored boxes to filter industries. Click again to remove filter. Bubble size represents Job Count.",
          },
          {
            icon: "⏱️",
            title: "Timeline Control (Bottom)",
            desc: "Drag the 🕐 clock icon to scrub through years. Click the ▶️ Play button to auto-play animation. Click any year tick to jump directly.",
          },
          {
            icon: "👆",
            title: "Data Interaction",
            desc: "Click any bubble to see detailed stats. Solid circles = Current year, Hollow circles = Previous year. Dashed line shows year-over-year change.",
          },
        ],
      };
    } else {
      return {
        title: "⚖️ Compare Mode Guide",
        items: [
          {
            icon: "🎛️",
            title: "Mode Switcher (Top Left)",
            desc: "Switch back to Timeflow mode to see animated evolution over time.",
          },
          {
            icon: "🎨",
            title: "Industry Filter (Right Side)",
            desc: "Select 1-3 industries to see detailed comparison cards. Bubble size represents Job Count in that year.",
          },
          {
            icon: "⏱️",
            title: "Dual Timeline Control (Bottom)",
            desc: "Drag ● blue marker (Left Year) and ○ orange marker (Right Year) to select comparison years. Solid circles = Left year data, Hollow circles = Right year data.",
          },
          {
            icon: "📊",
            title: "Comparison View",
            desc: "When 1-3 industries filtered, see detailed cards showing both years side-by-side. Arrows show direction of change. Click any bubble for full details.",
          },
        ],
      };
    }
  };

  // 数据加载
  useEffect(() => {
    const loadData = async () => {
      try {
        // 在useEffect中替换generateMockData()为：
        const rawData = await d3.csv("/ai_impact_jobs_2010_2025.csv");

        const processed = d3
          .rollups(
            rawData,
            (v) => ({
              avgSalary: d3.mean(v, (d) => +d.salary_usd),
              avgAIIntensity: d3.mean(v, (d) => +d.ai_intensity_score),
              avgAutomationRisk: d3.mean(v, (d) => +d.automation_risk_score),
              jobCount: v.length,
              year: +v[0].posting_year,
              industry: v[0].industry,
            }),
            (d) => +d.posting_year,
            (d) => d.industry,
          )
          .flatMap(([year, industries]) =>
            industries.map(([industry, stats]) => ({
              ...stats,
              id: `${industry}-${year}`,
              year,
              industry,
            })),
          );

        setData(processed);
        const minY = d3.min(processed, (d) => d.year);
        const maxY = d3.max(processed, (d) => d.year);
        setCurrentYear(minY);
        setCompareYears({ left: minY, right: maxY });
      } catch (error) {
        console.error("Data loading failed:", error);
      }
    };
    loadData();
  }, []);

  // 播放控制
  useEffect(() => {
    let timer;
    if (isPlaying && mode === "timeflow") {
      timer = setInterval(() => {
        setCurrentYear((prev) => {
          const maxYear = d3.max(data, (d) => d.year);
          if (prev >= maxYear) {
            setIsPlaying(false);
            return maxYear;
          }
          return prev + 1;
        });
      }, 800);
    }
    return () => clearInterval(timer);
  }, [isPlaying, data, mode]);

  // 动态更新选中点
  useEffect(() => {
    if (selectedPoint && mode === "timeflow") {
      const currentData = data.find((d) => d.industry === selectedPoint.industry && d.year === currentYear);
      if (currentData && selectedPoint.type === "current") {
        setSelectedPoint({ ...currentData, type: "current" });
      }
    }
  }, [currentYear, data, mode]);

  const scales = useMemo(() => {
    if (data.length === 0) return null;
    const xExtent = d3.extent(data, (d) => d.avgAIIntensity);
    const yExtent = d3.extent(data, (d) => d.avgSalary);
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;

    return {
      x: d3
        .scaleLinear()
        .domain([Math.max(0, xExtent[0] - xPadding), Math.min(1, xExtent[1] + xPadding)])
        .range([0, WIDTH])
        .nice(),
      y: d3
        .scaleLinear()
        .domain([Math.max(0, yExtent[0] - yPadding), yExtent[1] + yPadding])
        .range([HEIGHT, 0])
        .nice(),
      size: d3
        .scaleSqrt()
        .domain([0, d3.max(data, (d) => d.jobCount)])
        .range([8, 45]),
      opacity: d3.scaleLinear().domain([0.4, 0.8]).range([0.35, 1.0]).clamp(true),
    };
  }, [data]);

  // 主绘制函数
  useEffect(() => {
    if (!scales || data.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // 箭头标记
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#64748b");

    // 网格线
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${HEIGHT})`)
      .call(d3.axisBottom(scales.x).tickSize(-HEIGHT).tickFormat(""))
      .selectAll("line")
      .style("stroke", "#e2e8f0")
      .style("stroke-dasharray", "2,2");
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(scales.y).tickSize(-WIDTH).tickFormat(""))
      .selectAll("line")
      .style("stroke", "#e2e8f0")
      .style("stroke-dasharray", "2,2");

    // X轴
    const xAxis = g
      .append("g")
      .attr("transform", `translate(0,${HEIGHT})`)
      .call(
        d3
          .axisBottom(scales.x)
          .ticks(8)
          .tickFormat((d) => d.toFixed(2)),
      );
    xAxis.select(".domain").attr("stroke", "#475569").attr("stroke-width", 2);
    xAxis.selectAll("text").attr("fill", "#475569").style("font-size", "11px");
    xAxis
      .append("text")
      .attr("x", WIDTH / 2)
      .attr("y", 40)
      .attr("fill", "#1e293b")
      .style("text-anchor", "middle")
      .style("font-size", "13px")
      .style("font-weight", "600")
      .text("AI Intensity Score");

    // Y轴
    const yAxis = g.append("g").call(
      d3
        .axisLeft(scales.y)
        .ticks(8)
        .tickFormat((d) => `$${(d / 1000).toFixed(0)}k`),
    );
    yAxis.select(".domain").attr("stroke", "#475569").attr("stroke-width", 2);
    yAxis.selectAll("text").attr("fill", "#475569").style("font-size", "11px");
    yAxis
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -50)
      .attr("x", -HEIGHT / 2)
      .attr("fill", "#1e293b")
      .style("text-anchor", "middle")
      .style("font-size", "13px")
      .style("font-weight", "600")
      .text("Average Salary (USD)");

    if (mode === "timeflow") {
      drawTimeflowMode(g);
    } else {
      drawCompareMode(g);
    }
    drawLegend(svg);
  }, [data, currentYear, selectedIndustries, selectedPoint, mode, compareYears, scales]);

  const drawTimeflowMode = (g) => {
    const prevYear = currentYear - 1;
    const currentData = data.filter((d) => d.year === currentYear);
    const prevData = data.filter((d) => d.year === prevYear);
    const isHighlighted = selectedPoint !== null;

    if (prevYear >= d3.min(data, (d) => d.year)) {
      g.selectAll(".prev-circle")
        .data(prevData.filter((d) => selectedIndustries.size === 0 || selectedIndustries.has(d.industry)))
        .join("circle")
        .attr("class", "prev-circle")
        .attr("cx", (d) => scales.x(d.avgAIIntensity))
        .attr("cy", (d) => scales.y(d.avgSalary))
        .attr("r", (d) => scales.size(d.jobCount))
        .attr("fill", "none")
        .attr("stroke", (d) => INDUSTRY_COLORS[d.industry])
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,2")
        .attr("opacity", (d) =>
          isHighlighted && selectedPoint?.industry !== d.industry ? 0.1 : scales.opacity(d.avgAutomationRisk) * 0.5,
        )
        .style("cursor", "pointer")
        .on("click", (e, d) => {
          e.stopPropagation();
          setSelectedPoint({ ...d, type: "prev" });
        })
        .on("mouseenter", (e, d) => setHoveredPoint(d))
        .on("mouseleave", () => setHoveredPoint(null));
    }

    g.selectAll(".current-circle")
      .data(currentData.filter((d) => selectedIndustries.size === 0 || selectedIndustries.has(d.industry)))
      .join("circle")
      .attr("class", "current-circle")
      .attr("cx", (d) => scales.x(d.avgAIIntensity))
      .attr("cy", (d) => scales.y(d.avgSalary))
      .attr("r", (d) => scales.size(d.jobCount))
      .attr("fill", (d) => INDUSTRY_COLORS[d.industry])
      .attr("stroke", (d) => (selectedPoint?.id === d.id ? "#ffffff" : hoveredPoint?.id === d.id ? "#000000" : "none"))
      .attr("stroke-width", (d) => (selectedPoint?.id === d.id || hoveredPoint?.id === d.id ? 3 : 0))
      .attr("opacity", (d) =>
        isHighlighted && selectedPoint?.industry !== d.industry ? 0.1 : scales.opacity(d.avgAutomationRisk),
      )
      .style("cursor", "pointer")
      .on("click", (e, d) => {
        e.stopPropagation();
        setSelectedPoint({ ...d, type: "current" });
      })
      .on("mouseenter", (e, d) => setHoveredPoint(d))
      .on("mouseleave", () => setHoveredPoint(null));

    if (selectedPoint) {
      const targetYear = selectedPoint.type === "current" ? prevYear : currentYear;
      const targetData = data.find((d) => d.industry === selectedPoint.industry && d.year === targetYear);
      if (targetData) {
        g.append("line")
          .attr("class", "connection-line")
          .attr("x1", scales.x(selectedPoint.avgAIIntensity))
          .attr("y1", scales.y(selectedPoint.avgSalary))
          .attr("x2", scales.x(targetData.avgAIIntensity))
          .attr("y2", scales.y(targetData.avgSalary))
          .attr("stroke", INDUSTRY_COLORS[selectedPoint.industry])
          .attr("stroke-width", 2.5)
          .attr("stroke-dasharray", "5,5");
        g.append("circle")
          .attr("cx", scales.x(targetData.avgAIIntensity))
          .attr("cy", scales.y(targetData.avgSalary))
          .attr("r", scales.size(targetData.jobCount) + 4)
          .attr("fill", "none")
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
      }
    }
  };

  const drawCompareMode = (g) => {
    const leftData = data.filter((d) => d.year === compareYears.left);
    const rightData = data.filter((d) => d.year === compareYears.right);
    const filteredLeft = leftData.filter((d) => selectedIndustries.size === 0 || selectedIndustries.has(d.industry));
    const filteredRight = rightData.filter((d) => selectedIndustries.size === 0 || selectedIndustries.has(d.industry));

    g.selectAll(".compare-right")
      .data(filteredRight)
      .join("circle")
      .attr("class", "compare-right")
      .attr("cx", (d) => scales.x(d.avgAIIntensity))
      .attr("cy", (d) => scales.y(d.avgSalary))
      .attr("r", (d) => scales.size(d.jobCount))
      .attr("fill", "none")
      .attr("stroke", (d) => INDUSTRY_COLORS[d.industry])
      .attr("stroke-width", 2)
      .attr("opacity", (d) => scales.opacity(d.avgAutomationRisk) * 0.6);

    filteredLeft.forEach((left) => {
      const right = filteredRight.find((d) => d.industry === left.industry);
      if (right) {
        g.append("line")
          .attr("x1", scales.x(left.avgAIIntensity))
          .attr("y1", scales.y(left.avgSalary))
          .attr("x2", scales.x(right.avgAIIntensity))
          .attr("y2", scales.y(right.avgSalary))
          .attr("stroke", INDUSTRY_COLORS[left.industry])
          .attr("stroke-width", 2)
          .attr("opacity", 0.6)
          .attr("marker-end", "url(#arrowhead)");
      }
    });

    g.selectAll(".compare-left")
      .data(filteredLeft)
      .join("circle")
      .attr("class", "compare-left")
      .attr("cx", (d) => scales.x(d.avgAIIntensity))
      .attr("cy", (d) => scales.y(d.avgSalary))
      .attr("r", (d) => scales.size(d.jobCount))
      .attr("fill", (d) => INDUSTRY_COLORS[d.industry])
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .attr("opacity", (d) => scales.opacity(d.avgAutomationRisk));
  };

  const drawLegend = (svg) => {
    const industries = [...new Set(data.map((d) => d.industry))];
    const legendG = svg.append("g").attr("transform", `translate(${WIDTH + MARGIN.left + 20}, ${MARGIN.top})`);

    legendG
      .append("text")
      .attr("x", 0)
      .attr("y", -10)
      .attr("fill", "#1e293b")
      .style("font-size", "13px")
      .style("font-weight", "bold")
      .text("Industry Filter");

    industries.forEach((industry, i) => {
      const row = legendG
        .append("g")
        .attr("transform", `translate(0, ${i * 26})`)
        .style("cursor", "pointer")
        .on("click", () => toggleIndustry(industry));
      row
        .append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("rx", 3)
        .attr("fill", INDUSTRY_COLORS[industry])
        .attr("opacity", selectedIndustries.size === 0 || selectedIndustries.has(industry) ? 1 : 0.3)
        .attr("stroke", selectedIndustries.has(industry) ? "#1e293b" : "none")
        .attr("stroke-width", 2);
      row
        .append("text")
        .attr("x", 22)
        .attr("y", 11)
        .text(industry)
        .attr("fill", "#1e293b")
        .attr("font-size", "12px")
        .attr("opacity", selectedIndustries.size === 0 || selectedIndustries.has(industry) ? 1 : 0.3);
    });

    // Opacity说明
    const opacityG = legendG.append("g").attr("transform", `translate(0, ${industries.length * 26 + 15})`);
    opacityG.append("text").attr("fill", "#64748b").attr("font-size", "10px").text("Opacity = Risk (40%-80%)");
    const gradientId = "opacity-gradient";
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient").attr("id", gradientId).attr("x1", "0%").attr("x2", "100%");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#64748b").attr("stop-opacity", 0.35);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#64748b").attr("stop-opacity", 1);
    opacityG
      .append("rect")
      .attr("y", 15)
      .attr("width", 80)
      .attr("height", 6)
      .attr("rx", 3)
      .attr("fill", `url(#${gradientId})`);
    opacityG.append("text").attr("y", 32).attr("fill", "#64748b").attr("font-size", "9px").text("Low → High");

    // Size说明（Job Count）
    const sizeG = legendG.append("g").attr("transform", `translate(0, ${industries.length * 26 + 55})`);
    sizeG.append("text").attr("fill", "#64748b").attr("font-size", "10px").text("Size = Job Count");

    const sizeScale = d3.scaleSqrt().domain([0, 100]).range([4, 20]);
    [20, 50, 100].forEach((count, i) => {
      sizeG
        .append("circle")
        .attr("cx", 10 + i * 25)
        .attr("cy", 25)
        .attr("r", sizeScale(count))
        .attr("fill", "none")
        .attr("stroke", "#64748b")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.6);
    });
    sizeG.append("text").attr("x", 0).attr("y", 55).attr("fill", "#64748b").attr("font-size", "9px").text("Few");
    sizeG.append("text").attr("x", 55).attr("y", 55).attr("fill", "#64748b").attr("font-size", "9px").text("Many");
  };

  const toggleIndustry = (industry) => {
    const newSet = new Set(selectedIndustries);
    if (newSet.has(industry)) newSet.delete(industry);
    else newSet.add(industry);
    setSelectedIndustries(newSet);
  };

  const handleSvgClick = () => setSelectedPoint(null);

  const getCompareDisplayIndustries = () => {
    if (selectedIndustries.size === 0) return [];
    if (selectedIndustries.size <= 3) return [...selectedIndustries];
    return [];
  };

  const generateMockData = () => {
    const industries = Object.keys(INDUSTRY_COLORS).filter((k) => k !== "default");
    const data = [];
    for (let year = 2010; year <= 2025; year++) {
      industries.forEach((industry) => {
        const yearProgress = (year - 2010) / 15;
        const baseSalary = 35000 + yearProgress * 40000 + Math.random() * 20000;
        const baseAI = 0.2 + yearProgress * 0.5 + Math.random() * 0.2;
        const baseRisk = 0.4 + Math.random() * 0.4;
        const count = Math.floor(Math.random() * 80) + 30;
        for (let i = 0; i < count; i++) {
          data.push({
            job_id: `mock-${year}-${industry}-${i}`,
            posting_year: year,
            industry: industry,
            salary_usd: baseSalary + (Math.random() - 0.5) * 15000,
            ai_intensity_score: Math.min(Math.max(baseAI + (Math.random() - 0.5) * 0.15, 0), 1),
            automation_risk_score: Math.min(Math.max(baseRisk + (Math.random() - 0.5) * 0.1, 0.4), 0.8),
          });
        }
      });
    }
    return data;
  };

  if (data.length === 0) return <div className="loading">Initializing Time Machine...</div>;
  const yearRange = [d3.min(data, (d) => d.year), d3.max(data, (d) => d.year)];
  const compareDisplayIndustries = getCompareDisplayIndustries();
  const guideContent = getGuideContent();

  return (
    <div className="task2-container">
      {/* 引导层 */}
      {showGuide && (
        <div className="guide-overlay" onClick={() => setShowGuide(false)}>
          <div className="guide-content" onClick={(e) => e.stopPropagation()}>
            <div className="guide-header">
              <h2>{guideContent.title}</h2>
              <div className="mode-indicator">{mode === "timeflow" ? "⏱️ Timeflow Mode" : "⚖️ Compare Mode"}</div>
            </div>
            <div className="guide-sections">
              {guideContent.items.map((item, idx) => (
                <div key={idx} className="guide-item">
                  <div className="guide-icon">{item.icon}</div>
                  <div className="guide-text">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="start-btn" onClick={() => setShowGuide(false)}>
              Got it, let's explore! →
            </button>
          </div>
        </div>
      )}

      {/* 控制栏 */}
      <div className="control-bar">
        <div className="mode-switcher">
          <button className={mode === "timeflow" ? "active" : ""} onClick={() => setMode("timeflow")}>
            ⏱️ Timeflow
          </button>
          <button className={mode === "compare" ? "active" : ""} onClick={() => setMode("compare")}>
            ⚖️ Compare
          </button>
        </div>
        <button className="help-btn" onClick={() => setShowGuide(true)}>
          ❓ How to Use
        </button>
      </div>

      {/* 图表区域 */}
      <div className="chart-wrapper">
        <div className="chart-container">
          <svg
            ref={svgRef}
            width={WIDTH + MARGIN.left + MARGIN.right}
            height={HEIGHT + MARGIN.top + MARGIN.bottom}
            onClick={handleSvgClick}
          />

          {/* Timeflow详情面板 */}
          {mode === "timeflow" && selectedPoint && (
            <div className="detail-panel" style={{ top: MARGIN.top + 20, right: 20 }}>
              <div className="panel-header" style={{ backgroundColor: INDUSTRY_COLORS[selectedPoint.industry] }}>
                <div className="header-content">
                  <span className="industry-name">{selectedPoint.industry}</span>
                  <span className="year-tag">{selectedPoint.year}</span>
                </div>
                <button className="close-btn-header" onClick={() => setSelectedPoint(null)}>
                  ×
                </button>
              </div>
              <div className="panel-body">
                <div className="stat-row">
                  <span>Avg Salary:</span>
                  <strong>${Math.round(selectedPoint.avgSalary).toLocaleString()}</strong>
                </div>
                <div className="stat-row">
                  <span>AI Intensity:</span>
                  <strong>{selectedPoint.avgAIIntensity.toFixed(3)}</strong>
                </div>
                <div className="stat-row">
                  <span>Auto Risk:</span>
                  <strong className="risk-text">{(selectedPoint.avgAutomationRisk * 100).toFixed(1)}%</strong>
                </div>
                <div className="stat-row">
                  <span>Job Count:</span>
                  <strong>{selectedPoint.jobCount}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Compare对比面板 */}
          {mode === "compare" && compareDisplayIndustries.length > 0 && (
            <div className="compare-detail-panel" style={{ top: MARGIN.top, right: 10 }}>
              <div className="compare-header">
                <div className="compare-year-title">
                  <span className="year-solid">● {compareYears.left}</span>
                  <span className="vs-text">VS</span>
                  <span className="year-hollow">○ {compareYears.right}</span>
                </div>
              </div>
              <div className="compare-grid">
                {compareDisplayIndustries.map((industry) => {
                  const leftData = data.find((d) => d.industry === industry && d.year === compareYears.left);
                  const rightData = data.find((d) => d.industry === industry && d.year === compareYears.right);
                  if (!leftData || !rightData) return null;

                  return (
                    <div key={industry} className="compare-item">
                      <div className="compare-industry-header" style={{ color: INDUSTRY_COLORS[industry] }}>
                        {industry}
                      </div>
                      <div className="compare-rows">
                        <div className="compare-row solid-row">
                          <span className="dot">●</span>
                          <div className="row-stats">
                            <span>${Math.round(leftData.avgSalary / 1000)}k</span>
                            <span>AI:{leftData.avgAIIntensity.toFixed(2)}</span>
                            <span>Risk:{(leftData.avgAutomationRisk * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="compare-row hollow-row">
                          <span className="dot hollow">○</span>
                          <div className="row-stats">
                            <span>${Math.round(rightData.avgSalary / 1000)}k</span>
                            <span>AI:{rightData.avgAIIntensity.toFixed(2)}</span>
                            <span>Risk:{(rightData.avgAutomationRisk * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 时间轴 */}
      <div className="timeline-section">
        {mode === "timeflow" && (
          <button className={`play-button-cool ${isPlaying ? "playing" : ""}`} onClick={() => setIsPlaying(!isPlaying)}>
            <div className="button-inner">
              {isPlaying ? (
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                  <rect x="14" y="4" width="4" height="16" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              )}
            </div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay"></div>
          </button>
        )}
        {mode === "compare" && <div className="play-placeholder"></div>}

        <div className="timeline-track-container">
          <div className="timeline-track">
            <div className="track-bg"></div>
            <div className="ticks-container">
              {Array.from({ length: yearRange[1] - yearRange[0] + 1 }, (_, i) => {
                const year = yearRange[0] + i;
                const position = ((year - yearRange[0]) / (yearRange[1] - yearRange[0])) * 100;
                return (
                  <div key={year} className="year-tick" style={{ left: `${position}%` }}>
                    <div className="tick-line"></div>
                    <span className="tick-year">{year}</span>
                  </div>
                );
              })}
            </div>

            {mode === "timeflow" && (
              <div
                className="clock-draggable"
                style={{ left: `${((currentYear - yearRange[0]) / (yearRange[1] - yearRange[0])) * 100}%` }}
                onMouseDown={(e) => {
                  const track = e.currentTarget.parentElement;
                  const rect = track.getBoundingClientRect();
                  const handleDrag = (moveEvent) => {
                    const x = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
                    const percentage = x / rect.width;
                    const year = Math.round(yearRange[0] + percentage * (yearRange[1] - yearRange[0]));
                    setCurrentYear(Math.max(yearRange[0], Math.min(yearRange[1], year)));
                  };
                  const stopDrag = () => {
                    document.removeEventListener("mousemove", handleDrag);
                    document.removeEventListener("mouseup", stopDrag);
                  };
                  document.addEventListener("mousemove", handleDrag);
                  document.addEventListener("mouseup", stopDrag);
                }}
              >
                <div className="clock-icon-animated">
                  <svg viewBox="0 0 32 32" width="32" height="32">
                    <circle cx="16" cy="16" r="14" fill="#0ea5e9" stroke="#fff" strokeWidth="2" />
                    <line x1="16" y1="16" x2="16" y2="8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    <line x1="16" y1="16" x2="22" y2="16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="16" cy="16" r="2" fill="#fff" />
                    {[...Array(12)].map((_, i) => (
                      <line
                        key={i}
                        x1="16"
                        y1="4"
                        x2="16"
                        y2="6"
                        stroke="#fff"
                        strokeWidth="1"
                        transform={`rotate(${i * 30} 16 16)`}
                      />
                    ))}
                  </svg>
                </div>
                <div className="year-tooltip">{currentYear}</div>
              </div>
            )}

            {mode === "compare" && (
              <>
                <div
                  className="compare-handle left"
                  style={{ left: `${((compareYears.left - yearRange[0]) / (yearRange[1] - yearRange[0])) * 100}%` }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const track = e.currentTarget.parentElement;
                    const rect = track.getBoundingClientRect();
                    const handleDrag = (moveEvent) => {
                      const x = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
                      const year = Math.round(yearRange[0] + (x / rect.width) * (yearRange[1] - yearRange[0]));
                      setCompareYears((prev) => ({
                        ...prev,
                        left: Math.max(yearRange[0], Math.min(yearRange[1], year)),
                      }));
                    };
                    const stopDrag = () => {
                      document.removeEventListener("mousemove", handleDrag);
                      document.removeEventListener("mouseup", stopDrag);
                    };
                    document.addEventListener("mousemove", handleDrag);
                    document.addEventListener("mouseup", stopDrag);
                  }}
                >
                  <div className="handle-icon solid">●</div>
                  <div className="handle-label">{compareYears.left}</div>
                </div>

                <div
                  className="compare-handle right"
                  style={{ left: `${((compareYears.right - yearRange[0]) / (yearRange[1] - yearRange[0])) * 100}%` }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const track = e.currentTarget.parentElement;
                    const rect = track.getBoundingClientRect();
                    const handleDrag = (moveEvent) => {
                      const x = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
                      const year = Math.round(yearRange[0] + (x / rect.width) * (yearRange[1] - yearRange[0]));
                      setCompareYears((prev) => ({
                        ...prev,
                        right: Math.max(yearRange[0], Math.min(yearRange[1], year)),
                      }));
                    };
                    const stopDrag = () => {
                      document.removeEventListener("mousemove", handleDrag);
                      document.removeEventListener("mouseup", stopDrag);
                    };
                    document.addEventListener("mousemove", handleDrag);
                    document.addEventListener("mouseup", stopDrag);
                  }}
                >
                  <div className="handle-icon hollow">○</div>
                  <div className="handle-label">{compareYears.right}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Task2;
