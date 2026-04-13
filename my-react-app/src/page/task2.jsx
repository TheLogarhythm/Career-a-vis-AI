import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { useScrolly } from '../context/ScrollyContext'; // 新增：导入ScrollyContext
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
  const chartContainerRef = useRef(null);
  const pcScrollRef = useRef(null);
  const pcTooltipRef = useRef(null);
  const pcTooltipContentRef = useRef(null);
  const [data, setData] = useState([]);
  const [currentYear, setCurrentYear] = useState(2010);
  const [selectedIndustries, setSelectedIndustries] = useState(new Set());
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [mode, setMode] = useState("timeflow");
  const [compareYears, setCompareYears] = useState({ left: 2010, right: 2024 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showGuide, setShowGuide] = useState(true);

  // 引导相关状态与 refs（补充缺失的定义以避免未定义错误）
  const [guideState, setGuideState] = useState(() => {
    try {
      const saved = localStorage.getItem('task2_guide_state_v4');
      return saved ? JSON.parse(saved) : { timeflow: false, compare: false, parallel: false };
    } catch (e) {
      return { timeflow: false, compare: false, parallel: false };
    }
  });
  const [activeGuide, setActiveGuide] = useState(null);
  const [guideStep, setGuideStep] = useState(0);
  const [expandedChart, setExpandedChart] = useState(null);
  const [pcHoveredIndustry, setPcHoveredIndustry] = useState(null);

  // 简单占位函数/数据，真实引导内容可在后续完善
  const getGuideContent = () => ({ items: [] });
  const currentSteps = [];
  const currentStep = currentSteps[guideStep] || null;
  const closeGuide = () => { setActiveGuide(null); setShowGuide(false); };
  const nextStep = () => setGuideStep((s) => Math.min(s + 1, Math.max(0, currentSteps.length - 1)));
  const getHighlightPosition = () => ({ top: 0, left: 0, width: 0, height: 0 });
  const getGuidePosition = () => ({ top: 0, left: 0 });

  // 新增：使用ScrollyContext
  const { markTaskComplete } = useScrolly();

  // 新增：监听重新播放事件
  useEffect(() => {
    const handleReplay = (e) => {
      if (e.detail.sectionId === 3) { // Task 2是section-3
        // 重置所有状态
        setGuideState({ timeflow: false, compare: false, parallel: false });
        setActiveGuide(null);
        setGuideStep(0);
        setSelectedPoint(null);
        setSelectedIndustries(new Set());
        setIsPlaying(false);
        setExpandedChart(null);
        
        // 清除localStorage中的引导状态，让用户重新体验
        localStorage.removeItem('task2_guide_completed_v4');
        
        // 重新加载数据或重置到初始状态
        if (data.length > 0) {
          const minYear = d3.min(data, d => d.year);
          setCurrentYear(minYear);
          setCompareYears({ left: minYear, right: d3.max(data, d => d.year) });
        }
      }
    };
    
    window.addEventListener('replaySection', handleReplay);
    return () => window.removeEventListener('replaySection', handleReplay);
  }, [data]);

  // 新增：当用户完成所有引导步骤后标记Task完成
  useEffect(() => {
    if (guideState.timeflow && guideState.compare && guideState.parallel) {
      markTaskComplete(1); // Task 2的索引是1
      // 触发自定义事件通知外部
      window.dispatchEvent(new CustomEvent('task2-complete'));
    }
  }, [guideState, markTaskComplete]);

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
      const cx = 10 + i * 25;
      const r = sizeScale(count);
      sizeG
        .append("circle")
        .attr("cx", cx)
        .attr("cy", 25)
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", "#64748b")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.6);

      sizeG.append("text")
        .attr("x", cx)
        .attr("y", 25 + r + 12)
        .attr("text-anchor", "middle")
        .attr("fill", "#64748b")
        .attr("font-size", "9px")
        .text(String(count));
    });
  };

  const drawParallelCoordinates = () => {
    d3.select(svgRef.current).style("display", "none");
    const container = d3.select(pcScrollRef.current);
    container.style("display", "block").selectAll("*").remove();

    const grouped = d3.group(data, d => d.industry);
    const industries = Array.from(grouped, ([industry, values]) => ({
      industry,
      values: values.sort((a, b) => a.year - b.year),
      color: INDUSTRY_COLORS[industry] || INDUSTRY_COLORS.default
    })).filter(d => selectedIndustries.size === 0 || selectedIndustries.has(d.industry));

    const years = [...new Set(data.map(d => d.year))].sort();
    
    const isExpanded = expandedChart !== null;
    const pcWidth = isExpanded ? Math.min(1200, window.innerWidth - 100) : 800;
    const pcHeight = isExpanded ? 400 : 180;
    const pcMargin = isExpanded 
      ? { top: 50, right: 80, bottom: 60, left: 80 }
      : { top: 30, right: 50, bottom: 40, left: 60 };

    const metrics = [
      { 
        key: 'avgAIIntensity', 
        label: 'AI Intensity Score', 
        domain: d3.extent(data, d => d.avgAIIntensity),
        format: d => d.toFixed(2) 
      },
      { 
        key: 'avgSalary', 
        label: 'Average Salary (USD)', 
        domain: d3.extent(data, d => d.avgSalary),
        format: d => `$${(d/1000).toFixed(0)}k` 
      },
      { 
        key: 'avgAutomationRisk', 
        label: 'Automation Risk Score', 
        domain: d3.extent(data, d => d.avgAutomationRisk),
        format: d => (d*100).toFixed(0) + '%' 
      },
      { 
        key: 'jobCount', 
        label: 'Job Count', 
        domain: d3.extent(data, d => d.jobCount),
        format: d => d.toString() 
      }
    ];

    const chartsToRender = isExpanded ? [metrics[expandedChart]] : metrics;
    const chartIndices = isExpanded ? [expandedChart] : [0, 1, 2, 3];

    chartsToRender.forEach((metric, idx) => {
      const actualIdx = chartIndices[idx];
      const chartDiv = container.append("div")
        .attr("class", `pc-chart-box ${isExpanded ? 'expanded' : ''}`);
      
      const headerDiv = chartDiv.append("div").attr("class", "pc-chart-header");
      
      headerDiv.append("div")
        .attr("class", "pc-metric-title")
        .text(metric.label);
      
      const expandBtn = headerDiv.append("button")
        .attr("class", "pc-expand-btn")
        .attr("title", isExpanded ? "Exit fullscreen" : "Fullscreen")
        .html(isExpanded ? "⛶" : "⛶");
      
      expandBtn.on("click", () => {
        if (isExpanded) {
          setExpandedChart(null);
        } else {
          setExpandedChart(actualIdx);
        }
      });

      const svg = chartDiv.append("svg")
        .attr("width", pcWidth)
        .attr("height", pcHeight);

      const g = svg.append("g")
        .attr("transform", `translate(${pcMargin.left},${pcMargin.top})`);

      const yScale = d3.scaleLinear()
        .domain(metric.domain)
        .range([pcHeight - pcMargin.top - pcMargin.bottom, 0]);

      const xScale = d3.scalePoint()
        .domain(years)
        .range([0, pcWidth - pcMargin.left - pcMargin.right]);

      years.forEach(year => {
        const x = xScale(year);
        g.append("line")
          .attr("x1", x).attr("x2", x)
          .attr("y1", 0).attr("y2", pcHeight - pcMargin.top - pcMargin.bottom)
          .attr("stroke", "#e2e8f0").attr("stroke-dasharray", "2,2");
        
        g.append("text")
          .attr("x", x)
          .attr("y", pcHeight - pcMargin.top - pcMargin.bottom + 20)
          .attr("text-anchor", "middle")
          .attr("font-size", isExpanded ? "11px" : "9px")
          .attr("fill", "#64748b")
          .text(year);
      });

      const yAxis = g.append("g")
        .call(d3.axisLeft(yScale).ticks(isExpanded ? 8 : 5).tickFormat(metric.format));
      yAxis.selectAll("text")
        .attr("font-size", isExpanded ? "11px" : "9px")
        .attr("fill", "#64748b");

      const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d[metric.key]))
        .curve(d3.curveMonotoneX);

      // 修复：使用 DOM 操作代替 React state，实现丝滑跟随
      industries.forEach(ind => {
        const isHovered = pcHoveredIndustry === ind.industry;
        const isDimmed = pcHoveredIndustry && pcHoveredIndustry !== ind.industry;
        
        const path = g.append("path")
          .datum(ind.values)
          .attr("fill", "none")
          .attr("stroke", ind.color)
          .attr("stroke-width", isHovered ? (isExpanded ? 5 : 4) : (isExpanded ? 3 : 2))
          .attr("opacity", isDimmed ? 0.1 : 0.7)
          .attr("d", line)
          .style("cursor", "pointer");
        
        // 修复：mouseenter 更新内容，mousemove 只更新位置
        path.on("mouseenter", function(event) {
          setPcHoveredIndustry(ind.industry);
          
          const [mouseX] = d3.pointer(event);
          const closestYear = years.reduce((prev, curr) => 
            Math.abs(xScale(curr) - mouseX) < Math.abs(xScale(prev) - mouseX) ? curr : prev
          );
          
          const point = ind.values.find(v => v.year === closestYear);
          if (!point) return;

          const prevPoint = ind.values.find(v => v.year === closestYear - 1);
          const change = prevPoint ? 
            `<br/><span style="color:#94a3b8;font-size:11px;">from ${metric.format(prevPoint[metric.key])}</span>` : '';
          
          // 直接更新 DOM 内容，不触发 React 重渲染
          if (pcTooltipContentRef.current) {
            const header = pcTooltipContentRef.current.querySelector('.pc-tooltip-header');
            const label = pcTooltipContentRef.current.querySelector('.pc-tooltip-label');
            const value = pcTooltipContentRef.current.querySelector('.pc-tooltip-value');
            
            if (header) {
              header.textContent = `${ind.industry} - ${closestYear}`;
              header.style.color = ind.color;
            }
            if (label) label.textContent = metric.label;
            if (value) {
              value.innerHTML = `<strong>${metric.format(point[metric.key])}</strong>${change}`;
            }
            
            pcTooltipContentRef.current.style.borderColor = ind.color;
          }
          
          // 直接操作 DOM 显示和定位
          if (pcTooltipRef.current) {
            pcTooltipRef.current.style.opacity = '1';
            pcTooltipRef.current.style.visibility = 'visible';
            pcTooltipRef.current.style.left = `${event.clientX + 15}px`;
            pcTooltipRef.current.style.top = `${event.clientY - 10}px`;
          }
        })
        .on("mousemove", function(event) {
          // 只更新位置，不更新内容
          if (pcTooltipRef.current) {
            pcTooltipRef.current.style.left = `${event.clientX + 15}px`;
            pcTooltipRef.current.style.top = `${event.clientY - 10}px`;
          }
        })
        .on("mouseleave", function() {
          setPcHoveredIndustry(null);
          if (pcTooltipRef.current) {
            pcTooltipRef.current.style.opacity = '0';
            pcTooltipRef.current.style.visibility = 'hidden';
          }
        });
      });
      
      if (isExpanded) {
        const backBtn = chartDiv.append("button")
          .attr("class", "pc-back-btn")
          .html("← Back to all charts")
          .on("click", () => setExpandedChart(null));
      }
    });

    const legendDiv = container.append("div").attr("class", "pc-global-legend");
    legendDiv.append("div").attr("class", "pc-legend-title").text("Industries (Click to filter)");
    
    const allIndustries = [...new Set(data.map(d => d.industry))];
    const legendItems = legendDiv.append("div").attr("class", "pc-legend-items");
    
    allIndustries.forEach(industry => {
      const item = legendItems.append("div")
        .attr("class", "pc-legend-item")
        .style("opacity", selectedIndustries.size === 0 || selectedIndustries.has(industry) ? 1 : 0.3)
        .on("click", () => toggleIndustry(industry));
      
      item.append("div")
        .attr("class", "pc-legend-color")
        .style("background-color", INDUSTRY_COLORS[industry]);
      
      item.append("span").text(industry);
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
    <div className="task2-container scrolly-adapted" ref={chartContainerRef}> {/* 修改：添加scrolly-adapted类 */}
      {/* 引导系统 */}
      {activeGuide && currentStep && (
        <div className="guide-spotlight-overlay">
          <div className="spotlight-backdrop" onClick={closeGuide} />
          <div 
            className="spotlight-highlight" 
            style={getHighlightPosition(currentStep.target)}
          >
            <div className="spotlight-inner-glow" />
          </div>
          <div 
            className={`spotlight-tooltip spotlight-${currentStep.position}`}
            style={getGuidePosition(currentStep)}
          >
            <div className="spotlight-arrow" />
            <h3>{currentStep.title}</h3>
            <p>{currentStep.content}</p>
            <div className="spotlight-actions">
              <span>{guideStep + 1} / {currentSteps.length}</span>
              <button onClick={nextStep}>
                {guideStep === currentSteps.length - 1 ? 'Finish' : 'Next'}
              </button>
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
