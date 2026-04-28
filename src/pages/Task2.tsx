import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import "./task2.css";
import { dbUrl } from "../utils/paths";

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

const METRIC_LABELS = {
  avgSalary: "Avg Salary",
  avgAIIntensity: "AI Intensity",
  jobCount: "Job Count",
  avgAutomationRisk: "Auto Risk",
};

const METRIC_FORMATS = {
  avgSalary: (v) => `$${Math.round(v / 1000)}k`,
  avgAIIntensity: (v) => v.toFixed(2),
  jobCount: (v) => v.toString(),
  avgAutomationRisk: (v) => `${(v * 100).toFixed(0)}%`,
};

const MARGIN = { top: 60, right: 200, bottom: 100, left: 100 };
const WIDTH = 900 - MARGIN.left - MARGIN.right;
const HEIGHT = 550 - MARGIN.top - MARGIN.bottom;

// 引导步骤配置
const GUIDE_STEPS = {
  compare: [
    {
      target: ".mode-switcher",
      title: "Mode Switcher",
      content: "Switch between Compare and Parallel Coordinate views",
      position: "bottom",
    },
    {
      target: ".leaderboard-sidebar",
      title: "Industry Rankings",
      content: "Sort industries by different metrics. Click to highlight on chart",
      position: "right",
    },
    {
      target: ".compare-handle.left",
      title: "Start Year",
      content: "Drag the blue dot to select comparison start year",
      position: "top",
    },
    {
      target: ".compare-handle.right",
      title: "End Year",
      content: "Drag the orange dot to select comparison end year",
      position: "top",
    },
    {
      target: ".legend-container",
      title: "Industry Filter",
      content: "Click colored boxes to filter industries shown on chart",
      position: "left",
    },
  ],
  parallel: [
    {
      target: ".mode-switcher",
      title: "Mode Switcher",
      content: "Switch between different visualization modes",
      position: "bottom",
    },
    {
      target: ".pc-scroll-container",
      title: "Charts Area",
      content: "Scroll to view all 4 metric charts: AI Intensity, Salary, Risk, and Job Count",
      position: "right",
    },
    {
      target: ".pc-global-legend",
      title: "Industry Legend",
      content: "Click to filter industries. Hover over lines to see year-by-year values",
      position: "top",
    },
    {
      target: ".pc-chart-box",
      title: "Data Interaction",
      content: "Each line represents one industry trend over time. Hover for exact values.",
      position: "right",
    },
  ],
};

const Task2 = () => {
  const svgRef = useRef(null);
  const pcScrollRef = useRef(null);
  const timelineRef = useRef(null);
  const legendRef = useRef(null);
  const [data, setData] = useState([]);
  const [selectedIndustries, setSelectedIndustries] = useState(new Set());
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [mode, setMode] = useState("compare");
  const [compareYears, setCompareYears] = useState({ left: 2010, right: 2024 });
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [leaderboardMetric, setLeaderboardMetric] = useState("avgSalary");
  const [leaderboardSortOrder, setLeaderboardSortOrder] = useState("desc");
  const [leaderboardYearType, setLeaderboardYearType] = useState("right"); // "left" for solid, "right" for hollow
  const [isDragging, setIsDragging] = useState(false);
  const [tempCompareYears, setTempCompareYears] = useState({ left: 2010, right: 2024 });
  const [showTrace, setShowTrace] = useState(false);
  const [ghostYear, setGhostYear] = useState(null); // Ghost marker position for trace

  // 引导状态
  const [guideState, setGuideState] = useState(() => {
    const saved = localStorage.getItem("task2_guide_completed_v2");
    return saved ? JSON.parse(saved) : { compare: false, parallel: false };
  });
  const [activeGuide, setActiveGuide] = useState(null);
  const [guideStep, setGuideStep] = useState(0);

  const [pcHoveredIndustry, setPcHoveredIndustry] = useState(null);

  // 数据加载
  useEffect(() => {
    const loadData = async () => {
      try {
        const rawData = await d3.csv(dbUrl("ai_impact_jobs_2010_2025.csv"));

        // 检查数据结构
        if (rawData.length > 0) {
          console.log("CSV columns:", Object.keys(rawData[0]));
          console.log("Sample row:", rawData[0]);
        }

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
        setCompareYears({ left: minY, right: maxY });
      } catch (error) {
        console.error("Data loading failed:", error);
      }
    };
    loadData();
  }, []);

  // 检查是否需要显示引导
  useEffect(() => {
    if (!guideState[mode]) {
      setTimeout(() => startGuide(mode), 500);
    }
  }, [mode, guideState]);

  // 绑定拖拽事件到时间轴 - 修复：确保拖拽过程中手柄不消失
  useEffect(() => {
    if (!timelineRef.current || data.length === 0) return;

    const yearRange = [d3.min(data, (d) => d.year), d3.max(data, (d) => d.year)];
    const trackWidth = timelineRef.current.clientWidth;

    const leftHandle = d3.select(timelineRef.current).select(".compare-handle.left");
    if (!leftHandle.empty()) {
      // 清除旧的事件监听器
      leftHandle.on(".drag", null);

      const dragLeft = d3
        .drag()
        .on("start", function (event) {
          event.sourceEvent.stopPropagation();
          setIsDragging(true);
          d3.select(this)
            .classed("dragging", true) // 添加dragging class
            .style("cursor", "grabbing")
            .raise(); // 将元素移到同级元素的最后（视觉上在最前）
        })
        .on("drag", function (event) {
          event.sourceEvent.stopPropagation();
          const x = Math.max(0, Math.min(trackWidth, event.x));
          const percentage = x / trackWidth;
          const newYear = Math.round(yearRange[0] + percentage * (yearRange[1] - yearRange[0]));

          // 直接更新年份，React会处理UI更新
          setCompareYears((prev) => {
            const updatedLeft = Math.min(newYear, prev.right - 1);
            return { ...prev, left: updatedLeft };
          });
        })
        .on("end", function (event) {
          event.sourceEvent.stopPropagation();
          d3.select(this)
            .classed("dragging", false) // 移除dragging class
            .style("cursor", "grab");
          setIsDragging(false);
        });

      leftHandle.call(dragLeft);
    }

    const rightHandle = d3.select(timelineRef.current).select(".compare-handle.right");
    if (!rightHandle.empty()) {
      // 清除旧的事件监听器
      rightHandle.on(".drag", null);

      const dragRight = d3
        .drag()
        .on("start", function (event) {
          event.sourceEvent.stopPropagation();
          setIsDragging(true);
          d3.select(this).style("cursor", "grabbing").style("pointer-events", "all"); // 确保拖拽过程中元素保持可见和可交互
        })
        .on("drag", function (event) {
          event.sourceEvent.stopPropagation();
          const x = Math.max(0, Math.min(trackWidth, event.x));
          const percentage = x / trackWidth;
          const newYear = Math.round(yearRange[0] + percentage * (yearRange[1] - yearRange[0]));

          // 直接更新年份，React会处理UI更新
          setCompareYears((prev) => {
            const updatedRight = Math.max(newYear, prev.left + 1);
            return { ...prev, right: updatedRight };
          });
        })
        .on("end", function (event) {
          event.sourceEvent.stopPropagation();
          d3.select(this).style("cursor", "grab").style("pointer-events", "all");
          setIsDragging(false);
        });

      rightHandle.call(dragRight);
    }
  }, [mode, data]);

  // 根据实际数据计算比例尺范围
  const scales = useMemo(() => {
    if (data.length === 0) return null;

    const xExtent = d3.extent(data, (d) => d.avgAIIntensity);
    const xPadding = (xExtent[1] - xExtent[0]) * 0.05;

    const yExtent = d3.extent(data, (d) => d.avgSalary);
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;

    const sizeExtent = d3.extent(data, (d) => d.jobCount);

    return {
      x: d3
        .scaleLinear()
        .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
        .range([0, WIDTH])
        .nice(),
      y: d3
        .scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding * 2])
        .range([HEIGHT, 0])
        .nice(),
      size: d3.scaleSqrt().domain(sizeExtent).range([6, 35]),
      opacity: d3.scaleLinear().domain([0.4, 0.8]).range([0.35, 1.0]).clamp(true),
    };
  }, [data]);

  // 排行榜数据计算 - 根据用户选择的年份类型（实心/空心）动态更新
  const leaderboardData = useMemo(() => {
    if (data.length === 0) return [];
    // 根据leaderboardYearType选择使用左年份（实心）还是右年份（空心）的数据
    const targetYear = leaderboardYearType === "left" ? compareYears.left : compareYears.right;
    const yearData = data.filter((d) => d.year === targetYear);
    const filtered =
      selectedIndustries.size === 0 ? yearData : yearData.filter((d) => selectedIndustries.has(d.industry));

    return filtered
      .map((d) => ({
        industry: d.industry,
        value: d[leaderboardMetric],
        color: INDUSTRY_COLORS[d.industry] || INDUSTRY_COLORS.default,
      }))
      .sort((a, b) => (leaderboardSortOrder === "desc" ? b.value - a.value : a.value - b.value));
  }, [
    data,
    compareYears.left,
    compareYears.right,
    selectedIndustries,
    leaderboardMetric,
    leaderboardSortOrder,
    leaderboardYearType,
  ]);

  // 持久层绘制（坐标轴/网格/箭头等静态元素，只在 data/scales/mode 变化时重绘）
  const drawPersistentLayers = () => {
    const svg = d3.select(svgRef.current);
    svg.style("display", "block");
    if (pcScrollRef.current) pcScrollRef.current.style.display = "none";

    svg.selectAll("*").remove();

    // 箭头标记 - 增强可见性
    const defs = svg.append("defs");

    // 主箭头（深色）
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L10,0L0,4L2,0Z")
      .attr("fill", "#475569");

    // 高亮箭头（用于hover状态）
    defs
      .append("marker")
      .attr("id", "arrowhead-highlight")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 10)
      .attr("markerHeight", 10)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L10,0L0,4L2,0Z")
      .attr("fill", "#0ea5e9");

    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // 网格线
    g.append("g")
      .attr("class", "grid-x")
      .attr("transform", `translate(0,${HEIGHT})`)
      .call(d3.axisBottom(scales.x).tickSize(-HEIGHT).tickFormat(""))
      .selectAll("line")
      .style("stroke", "#e2e8f0")
      .style("stroke-dasharray", "2,2");
    g.append("g")
      .attr("class", "grid-y")
      .call(d3.axisLeft(scales.y).tickSize(-WIDTH).tickFormat(""))
      .selectAll("line")
      .style("stroke", "#e2e8f0")
      .style("stroke-dasharray", "2,2");

    // X轴
    const xAxis = g
      .append("g")
      .attr("class", "axis-x")
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
    const yAxis = g
      .append("g")
      .attr("class", "axis-y")
      .call(
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

    // 数据层容器（专门存放数据点，hover/拖拽时只更新这一层）
    g.append("g").attr("class", "data-layer");
  };

  // 数据点层更新（带平滑过渡动画，在 compareYears 或 hoveredPoint 变化时调用）
  const updateDataPoints = () => {
    const svg = d3.select(svgRef.current);
    const g = svg.select(".data-layer");
    if (g.empty()) return;

    const leftData = data.filter((d) => d.year === compareYears.left);
    const rightData = data.filter((d) => d.year === compareYears.right);
    const filteredLeft = leftData.filter((d) => selectedIndustries.size === 0 || selectedIndustries.has(d.industry));
    const filteredRight = rightData.filter((d) => selectedIndustries.size === 0 || selectedIndustries.has(d.industry));

    // --- 连接线 - 带箭头指示器 ---
    const linesData = filteredLeft.filter((l) => filteredRight.find((r) => r.industry === l.industry));

    g.selectAll(".compare-line")
      .data(linesData, (d) => d.industry)
      .join(
        (enter) =>
          enter
            .append("line")
            .attr("class", "compare-line")
            .attr("stroke", (d) => INDUSTRY_COLORS[d.industry])
            .attr("stroke-width", 2.5)
            .attr("opacity", 0)
            .attr("marker-end", "url(#arrowhead)")
            .style("cursor", "pointer")
            .call((sel) =>
              sel
                .transition()
                .duration(400)
                .ease(d3.easeCubicInOut)
                .attr("opacity", 0.7)
                .attr("x1", (d) => scales.x(d.avgAIIntensity))
                .attr("y1", (d) => scales.y(d.avgSalary))
                .attr("x2", (d) => {
                  const right = filteredRight.find((r) => r.industry === d.industry);
                  return right ? scales.x(right.avgAIIntensity) : 0;
                })
                .attr("y2", (d) => {
                  const right = filteredRight.find((r) => r.industry === d.industry);
                  return right ? scales.y(right.avgSalary) : 0;
                }),
            ),
        (update) =>
          update
            .interrupt() // 中断当前正在进行的过渡
            .transition()
            .duration(400)
            .ease(d3.easeCubicInOut)
            .attr("x1", (d) => scales.x(d.avgAIIntensity))
            .attr("y1", (d) => scales.y(d.avgSalary))
            .attr("x2", (d) => {
              const right = filteredRight.find((r) => r.industry === d.industry);
              return right ? scales.x(right.avgAIIntensity) : 0;
            })
            .attr("y2", (d) => {
              const right = filteredRight.find((r) => r.industry === d.industry);
              return right ? scales.y(right.avgSalary) : 0;
            })
            .attr("marker-end", "url(#arrowhead)"), // 确保过渡期间箭头不丢失
        (exit) => exit.transition().duration(300).attr("opacity", 0).remove(),
      )
      // 确保所有连接线（包括刚创建的）都有正确的箭头标记
      .attr("marker-end", "url(#arrowhead)")
      .on("mouseenter", function (e, d) {
        d3.select(this)
          .interrupt()
          .transition()
          .duration(150)
          .attr("stroke-width", 3.5)
          .attr("opacity", 1)
          .attr("marker-end", "url(#arrowhead-highlight)");
      })
      .on("mouseleave", function (e, d) {
        d3.select(this)
          .interrupt()
          .transition()
          .duration(200)
          .attr("stroke-width", 2.5)
          .attr("opacity", 0.7)
          .attr("marker-end", "url(#arrowhead)");
      });

    // --- 右端年份数据点（空心） ---
    g.selectAll(".compare-right")
      .data(filteredRight, (d) => d.industry) // 使用 industry 作为 key 确保平滑过渡
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "compare-right")
            .attr("cx", (d) => scales.x(d.avgAIIntensity))
            .attr("cy", (d) => scales.y(d.avgSalary))
            .attr("r", 0)
            .attr("fill", "none")
            .attr("stroke", (d) => INDUSTRY_COLORS[d.industry])
            .attr("stroke-width", 2.5)
            .attr("opacity", 0)
            .style("cursor", "pointer")
            .call((sel) =>
              sel
                .transition()
                .duration(400)
                .ease(d3.easeCubicInOut)
                .attr("r", (d) => scales.size(d.jobCount))
                .attr("opacity", (d) => scales.opacity(d.avgAutomationRisk) * 0.6),
            ),
        (update) =>
          update
            .interrupt() // 中断当前正在进行的过渡，实现平滑更新
            .transition()
            .duration(400)
            .ease(d3.easeCubicInOut)
            .attr("cx", (d) => scales.x(d.avgAIIntensity))
            .attr("cy", (d) => scales.y(d.avgSalary))
            .attr("r", (d) => scales.size(d.jobCount))
            .attr("opacity", (d) => scales.opacity(d.avgAutomationRisk) * 0.6)
            .attr("stroke", (d) => INDUSTRY_COLORS[d.industry])
            .attr("stroke-width", 2.5),
        (exit) => exit.transition().duration(300).ease(d3.easeCubicInOut).attr("r", 0).attr("opacity", 0).remove(),
      )
      .on("click", (e, d) => {
        e.stopPropagation();
        setSelectedPoint({ ...d, type: "right" });
        pulseCircle(e.target, INDUSTRY_COLORS[d.industry]);
      })
      .on("mouseenter", function (e, d) {
        setHoveredPoint(d);
        // 仅对当前悬停的点做局部高亮，不影响其他点
        d3.select(this)
          .interrupt()
          .transition()
          .duration(150)
          .ease(d3.easeCubicInOut)
          .attr("stroke", "#000000")
          .attr("stroke-width", 3)
          .attr("opacity", 1);
      })
      .on("mouseleave", function (e, d) {
        setHoveredPoint(null);
        // 悬停离开后恢复原样
        d3.select(this)
          .interrupt()
          .transition()
          .duration(200)
          .ease(d3.easeCubicInOut)
          .attr("stroke", INDUSTRY_COLORS[d.industry])
          .attr("stroke-width", 2.5)
          .attr("opacity", scales.opacity(d.avgAutomationRisk) * 0.6);
      });

    // --- 左端年份数据点（实心） - 添加白色描边提高可读性 ---
    g.selectAll(".compare-left")
      .data(filteredLeft, (d) => d.industry) // 使用 industry 作为 key 确保平滑过渡
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "compare-left")
            .attr("cx", (d) => scales.x(d.avgAIIntensity))
            .attr("cy", (d) => scales.y(d.avgSalary))
            .attr("r", 0)
            .attr("opacity", 0)
            .style("cursor", "pointer")
            .call((sel) =>
              sel
                .transition()
                .duration(400)
                .ease(d3.easeCubicInOut)
                .attr("r", (d) => scales.size(d.jobCount))
                .attr("opacity", (d) => scales.opacity(d.avgAutomationRisk))
                .attr("fill", (d) => INDUSTRY_COLORS[d.industry])
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 2),
            ),
        (update) =>
          update
            .interrupt() // 中断当前正在进行的过渡，实现平滑更新
            .transition()
            .duration(400)
            .ease(d3.easeCubicInOut)
            .attr("cx", (d) => scales.x(d.avgAIIntensity))
            .attr("cy", (d) => scales.y(d.avgSalary))
            .attr("r", (d) => scales.size(d.jobCount))
            .attr("opacity", (d) => scales.opacity(d.avgAutomationRisk))
            .attr("fill", (d) => INDUSTRY_COLORS[d.industry])
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2),
        (exit) => exit.transition().duration(300).ease(d3.easeCubicInOut).attr("r", 0).attr("opacity", 0).remove(),
      )
      .on("click", (e, d) => {
        e.stopPropagation();
        setSelectedPoint({ ...d, type: "left" });
        pulseCircle(e.target, INDUSTRY_COLORS[d.industry]);
      })
      .on("mouseenter", function (e, d) {
        setHoveredPoint(d);
        d3.select(this)
          .interrupt()
          .transition()
          .duration(150)
          .ease(d3.easeCubicInOut)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 3)
          .attr("opacity", 1);
      })
      .on("mouseleave", function (e, d) {
        setHoveredPoint(null);
        d3.select(this)
          .interrupt()
          .transition()
          .duration(200)
          .ease(d3.easeCubicInOut)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 2);
      });
  };

  // 主绘制调度
  useEffect(() => {
    if (!scales || data.length === 0) return;

    if (mode === "parallel") {
      drawParallelCoordinates();
    } else {
      // 每次 data / scales / mode 变化时，重绘持久层（清空并重建 SVG）
      drawPersistentLayers();
      // 然后绘制数据点层
      updateDataPoints();
      updateTraceLines(); // NEW: Render trace lines
      drawLegend();
    }
  }, [data, selectedIndustries, mode, scales, showTrace]);

  // 当 compareYears 或 hoveredPoint 变化时，仅更新数据点层（带过渡动画）
  useEffect(() => {
    if (!scales || data.length === 0 || mode === "parallel") return;
    updateDataPoints();
    updateTraceLines(); // NEW: Update traces when years change
  }, [compareYears.left, compareYears.right, hoveredPoint, selectedIndustries, showTrace, ghostYear]);

  // Cleanup trace lines when showTrace is disabled
  useEffect(() => {
    if (!showTrace) {
      const svg = d3.select(svgRef.current);
      svg.selectAll(".trace-position-line").remove();
      svg.selectAll(".trace-size-line").remove();
    }
  }, [showTrace]);

  // Initialize ghostYear when trace is enabled
  useEffect(() => {
    if (showTrace && ghostYear === null && data.length > 0) {
      setGhostYear(compareYears.left); // FIX: default to LEFT handle, not right
    }
    if (!showTrace) {
      setGhostYear(null);
    }
  }, [showTrace, data.length]);

  const drawMainChart = () => {
    // 保留兼容入口，实际工作由 drawPersistentLayers + updateDataPoints 完成
    drawPersistentLayers();
    updateDataPoints();
  };

  // 点击数据点的脉冲动画
  const pulseCircle = (element, color) => {
    const sel = d3.select(element);
    const currentR = parseFloat(sel.attr("r"));
    sel
      .transition()
      .duration(150)
      .ease(d3.easeCubicInOut)
      .attr("r", currentR + 4)
      .transition()
      .duration(150)
      .ease(d3.easeCubicInOut)
      .attr("r", currentR);
  };

  // Compute trace data for all visible industries between ghostYear and current year
  const computeTraceData = () => {
    if (!showTrace || ghostYear === null || ghostYear === compareYears.right) return [];

    const startYear = Math.min(ghostYear, compareYears.right);
    const endYear = Math.max(ghostYear, compareYears.right);

    // Get all industries that have data in both start and end years
    const industries = [...new Set(data.map((d) => d.industry))];
    const filteredIndustries = selectedIndustries.size === 0 ? industries : [...selectedIndustries];

    const traces = [];

    filteredIndustries.forEach((industry) => {
      // Get all data points for this industry within the year range
      const industryData = data
        .filter((d) => d.industry === industry && d.year >= startYear && d.year <= endYear)
        .sort((a, b) => a.year - b.year);

      if (industryData.length < 2) return; // Need at least 2 points to draw a line

      traces.push({
        industry,
        color: INDUSTRY_COLORS[industry] || INDUSTRY_COLORS.default,
        points: industryData.map((d) => ({
          year: d.year,
          x: scales.x(d.avgAIIntensity),
          y: scales.y(d.avgSalary),
          r: scales.size(d.jobCount),
          risk: d.avgAutomationRisk,
        })),
      });
    });

    return traces;
  };

  // Render trace lines showing industry evolution over time
  const updateTraceLines = () => {
    const svg = d3.select(svgRef.current);
    const g = svg.select(".data-layer");
    if (g.empty()) return;

    const traces = computeTraceData();

    // --- Position Trace (Solid Line) ---
    // Connects center positions (x, y) across years
    const positionLineGenerator = d3
      .line()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveMonotoneX);

    g.selectAll(".trace-position-line")
      .data(traces, (d) => d.industry)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "trace-position-line")
            .attr("fill", "none")
            .attr("stroke", (d) => d.color)
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.55)
            .attr("d", (d) => positionLineGenerator(d.points))
            .attr("opacity", 0)
            .call((sel) => sel.transition().duration(400).ease(d3.easeCubicInOut).attr("opacity", 1)),
        (update) =>
          update
            .interrupt()
            .transition()
            .duration(400)
            .ease(d3.easeCubicInOut)
            .attr("d", (d) => positionLineGenerator(d.points))
            .attr("stroke", (d) => d.color),
        (exit) => exit.transition().duration(300).attr("opacity", 0).remove(),
      );

    // --- Size Trace: dashed ghost circles at each historical position ---
    // Flatten all (industry × year) points into one array keyed by industry+year
    const allPoints = traces.flatMap((trace) =>
      trace.points.map((pt) => ({
        key: `${trace.industry}-${pt.year}`,
        industry: trace.industry,
        color: trace.color,
        ...pt,
      })),
    );

    g.selectAll(".trace-size-line")
      .data(allPoints, (d) => d.key)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "trace-size-line")
            .attr("fill", "none")
            .attr("stroke", (d) => d.color)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4,3")
            .attr("stroke-opacity", 0.6)
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", 0)
            .call((sel) =>
              sel
                .transition()
                .duration(400)
                .ease(d3.easeCubicInOut)
                .attr("r", (d) => d.r),
            ),
        (update) =>
          update
            .interrupt()
            .transition()
            .duration(400)
            .ease(d3.easeCubicInOut)
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", (d) => d.r)
            .attr("stroke", (d) => d.color),
        (exit) => exit.transition().duration(300).attr("r", 0).remove(),
      );
  };

  // HTML 图例渲染
  const drawLegend = () => {
    if (!legendRef.current) return;
    const container = d3.select(legendRef.current);
    container.selectAll("*").remove();

    const industries = [...new Set(data.map((d) => d.industry))];

    container.append("div").attr("class", "legend-title").text("Industry Filter");

    industries.forEach((industry) => {
      const item = container
        .append("div")
        .attr("class", "legend-item")
        .style("opacity", selectedIndustries.size === 0 || selectedIndustries.has(industry) ? 1 : 0.3)
        .on("click", () => toggleIndustry(industry));

      item
        .append("div")
        .attr("class", "legend-color-box")
        .style("background-color", INDUSTRY_COLORS[industry])
        .style("border", selectedIndustries.has(industry) ? "2px solid #1e293b" : "none");

      item.append("span").text(industry);
    });

    // Opacity 说明
    const opacitySection = container.append("div").attr("class", "legend-section");
    opacitySection.append("div").attr("class", "legend-section-title").text("Opacity = Risk (40%-80%)");
    opacitySection.append("div").attr("class", "legend-gradient-bar");

    // Size 说明
    const sizeSection = container.append("div").attr("class", "legend-section");
    sizeSection.append("div").attr("class", "legend-section-title").text("Size = Job Count");

    const jobCountExtent = d3.extent(data, (d) => d.jobCount);
    const sizeScale = d3.scaleSqrt().domain(jobCountExtent).range([6, 20]);

    const minCount = jobCountExtent[0];
    const maxCount = jobCountExtent[1];
    const midCount = Math.round((minCount + maxCount) / 2);

    const sizeExamples = [
      { count: minCount, label: minCount.toString() },
      { count: midCount, label: midCount.toString() },
      { count: maxCount, label: maxCount.toString() },
    ];

    const sizeRow = sizeSection.append("div").attr("class", "legend-size-row");
    sizeExamples.forEach((example) => {
      const r = sizeScale(example.count);
      const item = sizeRow.append("div").attr("class", "legend-size-example");
      item
        .append("div")
        .attr("class", "legend-size-circle")
        .style("width", r * 2 + "px")
        .style("height", r * 2 + "px")
        .style("border-radius", "50%")
        .style("border", "1.5px solid #64748b")
        .style("opacity", 0.6)
        .style("margin", "0 auto");

      item.append("div").attr("class", "legend-size-label").text(example.label);
    });
  };

  // Parallel Coordinates绘制
  const drawParallelCoordinates = () => {
    d3.select(svgRef.current).style("display", "none");
    const container = d3.select(pcScrollRef.current);
    container.style("display", "block").selectAll("*").remove();

    const grouped = d3.group(data, (d) => d.industry);
    const industries = Array.from(grouped, ([industry, values]) => ({
      industry,
      values: values.sort((a, b) => a.year - b.year),
      color: INDUSTRY_COLORS[industry] || INDUSTRY_COLORS.default,
    })).filter((d) => selectedIndustries.size === 0 || selectedIndustries.has(d.industry));

    const years = [...new Set(data.map((d) => d.year))].sort();
    const pcWidth = 800;
    const pcHeight = 180;
    const pcMargin = { top: 30, right: 50, bottom: 40, left: 60 };

    const xScale = d3
      .scalePoint()
      .domain(years)
      .range([0, pcWidth - pcMargin.left - pcMargin.right]);

    const metrics = [
      {
        key: "avgAIIntensity",
        label: "AI Intensity Score",
        domain: d3.extent(data, (d) => d.avgAIIntensity),
        format: (d) => d.toFixed(2),
      },
      {
        key: "avgSalary",
        label: "Average Salary (USD)",
        domain: d3.extent(data, (d) => d.avgSalary),
        format: (d) => `$${(d / 1000).toFixed(0)}k`,
      },
      {
        key: "avgAutomationRisk",
        label: "Automation Risk Score",
        domain: d3.extent(data, (d) => d.avgAutomationRisk),
        format: (d) => (d * 100).toFixed(0) + "%",
      },
      {
        key: "jobCount",
        label: "Job Count",
        domain: d3.extent(data, (d) => d.jobCount),
        format: (d) => d.toString(),
      },
    ];

    metrics.forEach((metric, idx) => {
      const chartDiv = container.append("div").attr("class", "pc-chart-box");

      chartDiv.append("div").attr("class", "pc-metric-title").text(metric.label);

      const svg = chartDiv.append("svg").attr("width", pcWidth).attr("height", pcHeight);

      const g = svg.append("g").attr("transform", `translate(${pcMargin.left},${pcMargin.top})`);

      const yScale = d3
        .scaleLinear()
        .domain(metric.domain)
        .range([pcHeight - pcMargin.top - pcMargin.bottom, 0]);

      years.forEach((year) => {
        const x = xScale(year);
        g.append("line")
          .attr("x1", x)
          .attr("x2", x)
          .attr("y1", 0)
          .attr("y2", pcHeight - pcMargin.top - pcMargin.bottom)
          .attr("stroke", "#e2e8f0")
          .attr("stroke-dasharray", "2,2");

        g.append("text")
          .attr("x", x)
          .attr("y", pcHeight - pcMargin.top - pcMargin.bottom + 20)
          .attr("text-anchor", "middle")
          .attr("font-size", "9px")
          .attr("fill", "#64748b")
          .text(year);
      });

      const yAxis = g.append("g").call(d3.axisLeft(yScale).ticks(5).tickFormat(metric.format));
      yAxis.selectAll("text").attr("font-size", "9px").attr("fill", "#64748b");

      const line = d3
        .line()
        .x((d) => xScale(d.year))
        .y((d) => yScale(d[metric.key]))
        .curve(d3.curveMonotoneX);

      industries.forEach((ind) => {
        const isHovered = pcHoveredIndustry === ind.industry;
        const isDimmed = pcHoveredIndustry && pcHoveredIndustry !== ind.industry;

        g.append("path")
          .datum(ind.values)
          .attr("fill", "none")
          .attr("stroke", ind.color)
          .attr("stroke-width", isHovered ? 4 : 2)
          .attr("opacity", isDimmed ? 0.1 : 0.7)
          .attr("d", line)
          .style("cursor", "pointer")
          .on("mouseenter", (e) => {
            setPcHoveredIndustry(ind.industry);
            showPCTooltip(e, ind, metric, xScale, yScale);
          })
          .on("mouseleave", () => {
            setPcHoveredIndustry(null);
            hidePCTooltip();
          });

        g.selectAll(`.pc-dot-${idx}-${ind.industry}`)
          .data(ind.values)
          .join("circle")
          .attr("cx", (d) => xScale(d.year))
          .attr("cy", (d) => yScale(d[metric.key]))
          .attr("r", isHovered ? 5 : 3)
          .attr("fill", ind.color)
          .attr("opacity", isDimmed ? 0.1 : 0.9)
          .style("cursor", "pointer")
          .on("mouseenter", (e, d) => {
            setPcHoveredIndustry(ind.industry);
            showPointTooltip(e, d, ind, metric);
          });
      });
    });

    const legendDiv = container.append("div").attr("class", "pc-global-legend");
    legendDiv.append("div").attr("class", "pc-legend-title").text("Industries (Click to filter)");

    const allIndustries = [...new Set(data.map((d) => d.industry))];
    const legendItems = legendDiv.append("div").attr("class", "pc-legend-items");

    allIndustries.forEach((industry) => {
      const item = legendItems
        .append("div")
        .attr("class", "pc-legend-item")
        .style("opacity", selectedIndustries.size === 0 || selectedIndustries.has(industry) ? 1 : 0.3)
        .on("click", () => toggleIndustry(industry));

      item.append("div").attr("class", "pc-legend-color").style("background-color", INDUSTRY_COLORS[industry]);

      item.append("span").text(industry);
    });
  };

  const showPCTooltip = (e, industry, metric, xScale, yScale) => {
    const mouseX = d3.pointer(e)[0];
    const years = xScale.domain();
    const closestYear = years.reduce((prev, curr) =>
      Math.abs(xScale(curr) - mouseX) < Math.abs(xScale(prev) - mouseX) ? curr : prev,
    );

    const point = industry.values.find((v) => v.year === closestYear);
    if (!point) return;

    const prevPoint = industry.values.find((v) => v.year === closestYear - 1);
    const change = prevPoint
      ? `<br/><span style="color:#94a3b8;font-size:11px;">from ${metric.format(prevPoint[metric.key])}</span>`
      : "";

    d3
      .select("body")
      .append("div")
      .attr("class", "pc-floating-tooltip")
      .style("left", e.clientX + 15 + "px")
      .style("top", e.clientY - 10 + "px").html(`
        <div style="color:${industry.color};font-weight:600;margin-bottom:4px;">${industry.industry} - ${closestYear}</div>
        <div>${metric.label}: <strong>${metric.format(point[metric.key])}</strong>${change}</div>
      `);
  };

  const showPointTooltip = (e, d, industry, metric) => {
    const prevPoint = industry.values.find((v) => v.year === d.year - 1);
    const change = prevPoint
      ? `<br/><span style="color:#94a3b8;font-size:11px;">from ${metric.format(prevPoint[metric.key])}</span>`
      : "";

    d3
      .select("body")
      .append("div")
      .attr("class", "pc-floating-tooltip")
      .style("left", e.clientX + 15 + "px")
      .style("top", e.clientY - 10 + "px").html(`
        <div style="color:${industry.color};font-weight:600;margin-bottom:4px;">${industry.industry} - ${d.year}</div>
        <div>${metric.format(d[metric.key])}${change}</div>
      `);
  };

  const hidePCTooltip = () => {
    d3.selectAll(".pc-floating-tooltip").remove();
  };

  const toggleIndustry = (industry) => {
    const newSet = new Set(selectedIndustries);
    if (newSet.has(industry)) newSet.delete(industry);
    else newSet.add(industry);
    setSelectedIndustries(newSet);
  };

  const startGuide = (guideMode) => {
    setActiveGuide(guideMode);
    setGuideStep(0);
  };

  const closeGuide = () => {
    const newState = { ...guideState, [activeGuide]: true };
    setGuideState(newState);
    localStorage.setItem("task2_guide_completed_v2", JSON.stringify(newState));
    setActiveGuide(null);
    setGuideStep(0);
  };

  const nextStep = () => {
    const steps = GUIDE_STEPS[activeGuide];
    if (guideStep < steps.length - 1) {
      setGuideStep(guideStep + 1);
    } else {
      closeGuide();
    }
  };

  const getHighlightPosition = (selector) => {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`Guide target not found: ${selector}`);
      return { display: "none" };
    }
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left - 4,
      top: rect.top - 4,
      width: rect.width + 8,
      height: rect.height + 8,
    };
  };

  const getGuidePosition = (step) => {
    const highlight = getHighlightPosition(step.target);
    if (highlight.display === "none") {
      return {
        left: window.innerWidth / 2,
        top: window.innerHeight / 2,
        transform: "translate(-50%, -50%)",
      };
    }

    const offset = 20;

    switch (step.position) {
      case "bottom":
        return {
          left: highlight.left + highlight.width / 2,
          top: highlight.top + highlight.height + offset,
          transform: "translate(-50%, 0)",
        };
      case "top":
        return {
          left: highlight.left + highlight.width / 2,
          top: highlight.top - offset,
          transform: "translate(-50%, -100%)",
        };
      case "left":
        return {
          left: highlight.left - offset,
          top: highlight.top + highlight.height / 2,
          transform: "translate(-100%, -50%)",
        };
      case "right":
        return {
          left: highlight.left + highlight.width + offset,
          top: highlight.top + highlight.height / 2,
          transform: "translate(0, -50%)",
        };
      default:
        return {
          left: highlight.left + highlight.width / 2,
          top: highlight.top + highlight.height + offset,
          transform: "translate(-50%, 0)",
        };
    }
  };

  const yearRange = data.length > 0 ? [d3.min(data, (d) => d.year), d3.max(data, (d) => d.year)] : [2010, 2024];
  const currentSteps = activeGuide ? GUIDE_STEPS[activeGuide] : [];
  const currentStep = currentSteps[guideStep];

  if (data.length === 0) return <div className="loading">Initializing Time Machine...</div>;

  return (
    <div className="task2-container">
      {/* Spotlight引导层 */}
      {activeGuide && currentStep && (
        <div className="guide-spotlight-overlay">
          <div className="spotlight-backdrop" onClick={closeGuide} />
          <div className="spotlight-highlight" style={getHighlightPosition(currentStep.target)}>
            <div className="spotlight-inner-glow" />
          </div>
          <div className={`spotlight-tooltip spotlight-${currentStep.position}`} style={getGuidePosition(currentStep)}>
            <div className="spotlight-arrow" />
            <h3>{currentStep.title}</h3>
            <p>{currentStep.content}</p>
            <div className="spotlight-actions">
              <span>
                {guideStep + 1} / {currentSteps.length}
              </span>
              <button onClick={nextStep}>{guideStep === currentSteps.length - 1 ? "Finish" : "Next"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 控制栏 */}
      <div className="control-bar">
        <div className="mode-switcher">
          <button className={mode === "compare" ? "active" : ""} onClick={() => setMode("compare")}>
            Compare
          </button>
          <button className={mode === "parallel" ? "active" : ""} onClick={() => setMode("parallel")}>
            Parallel
          </button>
        </div>
        {mode === "compare" && (
          <>
            <button
              className={`trace-toggle-btn ${showTrace ? "active" : ""}`}
              onClick={() => setShowTrace((prev) => !prev)}
              title="Show/hide industry evolution traces"
            >
              {showTrace ? "✦ Hide Trace" : "✦ Show Trace"}
            </button>
            {showTrace && ghostYear !== null && (
              <button
                className="set-start-point-btn"
                onClick={() => setGhostYear(compareYears.left)}
                title="Reset ghost marker to left (start) year"
              >
                ⦿ Set Start Point
              </button>
            )}
          </>
        )}
        <button className="help-btn" onClick={() => startGuide(mode)}>
          How to Use
        </button>
      </div>

      {/* 图表区域 */}
      <div className="chart-wrapper">
        <div className="chart-container">
          <div className="chart-layout-grid">
            {/* 左侧排行榜 */}
            {mode === "compare" && (
              <div className="leaderboard-sidebar">
                <div className="leaderboard-header">
                  <h4>Industry Rankings</h4>
                </div>
                <div className="metric-selector">
                  {Object.entries(METRIC_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      className={leaderboardMetric === key ? "active" : ""}
                      onClick={() => setLeaderboardMetric(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* 年份类型切换：实心圆点（左年份）vs 空心圆点（右年份） */}
                <div className="year-type-selector">
                  <button
                    className={`year-type-btn ${leaderboardYearType === "left" ? "active solid" : ""}`}
                    onClick={() => setLeaderboardYearType("left")}
                    title={`Use Solid dots (${compareYears.left})`}
                  >
                    ● {compareYears.left}
                  </button>
                  <button
                    className={`year-type-btn ${leaderboardYearType === "right" ? "active hollow" : ""}`}
                    onClick={() => setLeaderboardYearType("right")}
                    title={`Use Hollow dots (${compareYears.right})`}
                  >
                    ○ {compareYears.right}
                  </button>
                </div>
                <button
                  className="sort-toggle"
                  onClick={() => setLeaderboardSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                >
                  {leaderboardSortOrder === "desc" ? "↓ Descending" : "↑ Ascending"}
                </button>
                <div className="leaderboard-list">
                  {leaderboardData.map((item, index) => (
                    <div
                      key={item.industry}
                      className={`leaderboard-item ${selectedIndustries.has(item.industry) ? "selected" : ""}`}
                      style={{ borderLeftColor: item.color }}
                      onClick={() => toggleIndustry(item.industry)}
                    >
                      <div className="leaderboard-rank">{index + 1}</div>
                      <div className="leaderboard-color-dot" style={{ backgroundColor: item.color }} />
                      <div className="leaderboard-name">{item.industry}</div>
                      <div className="leaderboard-value">{METRIC_FORMATS[leaderboardMetric](item.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 中间图表区域 */}
            <div className="chart-main-area">
              <svg
                ref={svgRef}
                width={WIDTH + MARGIN.left + MARGIN.right}
                height={HEIGHT + MARGIN.top + MARGIN.bottom}
                style={{ display: mode === "parallel" ? "none" : "block" }}
              />

              <div
                ref={pcScrollRef}
                className="pc-scroll-container"
                style={{ display: mode === "parallel" ? "block" : "none" }}
              />

              {/* 图例容器 */}
              {mode === "compare" && <div ref={legendRef} className="legend-container" />}
            </div>

            {/* 右侧详情面板 */}
            <div className="detail-sidebar">
              {mode === "compare" && selectedPoint && (
                <div className="detail-panel">
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

              {mode === "compare" && selectedIndustries.size > 0 && (
                <div className="compare-detail-panel">
                  <div className="compare-header">
                    <div className="compare-year-title">
                      <span className="year-solid">{compareYears.left}</span>
                      <span className="vs-text">VS</span>
                      <span className="year-hollow">{compareYears.right}</span>
                    </div>
                  </div>
                  <div className="compare-grid">
                    {[...selectedIndustries].map((industry) => {
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

              {mode === "compare" && selectedIndustries.size === 0 && !selectedPoint && (
                <div className="detail-placeholder">
                  <p>Select industries from the chart or leaderboard to see details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 时间轴 */}
      <div className="timeline-section">
        <div className="timeline-track-container" ref={timelineRef}>
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

            {/* Compare mode handles - 直接使用compareYears状态 */}
            <div
              className="compare-handle left"
              style={{ left: `${((compareYears.left - yearRange[0]) / (yearRange[1] - yearRange[0])) * 100}%` }}
            >
              <div className="handle-icon solid">●</div>
              <div className="handle-label">{compareYears.left}</div>
            </div>
            <div
              className="compare-handle right"
              style={{ left: `${((compareYears.right - yearRange[0]) / (yearRange[1] - yearRange[0])) * 100}%` }}
            >
              <div className="handle-icon hollow">○</div>
              <div className="handle-label">{compareYears.right}</div>
            </div>

            {/* Ghost marker for trace mode */}
            {showTrace && ghostYear !== null && ghostYear !== compareYears.right && (
              <div
                className="ghost-marker"
                style={{ left: `${((ghostYear - yearRange[0]) / (yearRange[1] - yearRange[0])) * 100}%` }}
              >
                <div className="ghost-icon">◌</div>
                <div className="ghost-label">{ghostYear}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Task2;
