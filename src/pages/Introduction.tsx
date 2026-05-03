import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import "./introduction.css";
import { Globe, Briefcase, DollarSign, BarChart2 } from "lucide-react";
import { dbUrl } from "../utils/paths";

// ─── Seeded random for consistent data ──────────────────────
let _seed = 42;
function seededRandom() {
  _seed = (_seed * 16807) % 2147483647;
  return (_seed - 1) / 2147483646;
}
function resetSeed() {
  _seed = 42;
}

// ─── Shared data generation ─────────────────────────────────
const INDUSTRIES = [
  "Agriculture",
  "Education",
  "Energy",
  "Finance",
  "Government",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Tech",
];
const DECADES = ["2010-2014", "2015-2019", "2020-2025"];

function generateData() {
  resetSeed();
  const data: { industry: string; decade: string; value: number }[] = [];
  const decadeSums: Record<string, number> = {};
  DECADES.forEach((d) => (decadeSums[d] = 0));
  INDUSTRIES.forEach((ind) =>
    DECADES.forEach((dec, i) => {
      const val = 0.1 + i * 0.15 + seededRandom() * 0.15;
      data.push({ industry: ind, decade: dec, value: val });
      decadeSums[dec] += val;
    }),
  );
  const decadeAvgs = DECADES.map((dec) => ({
    decade: dec,
    value: decadeSums[dec] / INDUSTRIES.length,
  }));
  return { data, decadeAvgs };
}

const { data: HEATMAP_DATA, decadeAvgs: DECADE_AVGS } = generateData();

// ─── AIIntensityHeatmap: bar chart → heatmap morph ─────────
function AIIntensityHeatmap({
  morphProgress,
  tooltipRef,
}: {
  morphProgress: number;
  tooltipRef: React.RefObject<HTMLDivElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const allRefs = useRef<{
    bars: d3.Selection<SVGGElement, (typeof DECADE_AVGS)[number], SVGGElement, unknown>;
    cells: d3.Selection<SVGRectElement, (typeof HEATMAP_DATA)[number], SVGGElement, unknown>;
    yAxisBar: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>;
    yAxisHeat: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>;
    titleBar: d3.Selection<SVGTextElement, unknown, SVGGElement, unknown>;
    titleHeat: d3.Selection<SVGTextElement, unknown, SVGGElement, unknown>;
    legendG: d3.Selection<SVGGElement, unknown, SVGGElement, unknown>;
    yBar: d3.ScaleLinear<number, number>;
    heatH: number;
    color: d3.ScaleLinear<string, string>;
    morphProgress: number;
  } | null>(null);

  // ── Build SVG once ──
  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current).selectAll("*").remove();

    const svgW = 860;
    const svgH = 440;
    const margin = { top: 55, right: 55, bottom: 45, left: 140 };
    const heatW = svgW - margin.left - margin.right;
    const heatH = svgH - margin.top - margin.bottom;

    const svg = d3
      .select(containerRef.current)
      .append("svg")
      .attr("viewBox", `0 0 ${svgW} ${svgH}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .style("overflow", "visible");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleBand().range([0, heatW]).domain(DECADES).padding(0.08);
    const yHeat = d3
      .scaleBand()
      .range([0, heatH])
      .domain([...INDUSTRIES].reverse())
      .padding(0.08);
    const yBar = d3.scaleLinear().domain([0, 0.6]).range([heatH, 0]);
    const color = d3.scaleLinear().domain([0.1, 0.35, 0.6]).range(["#22c55e", "#facc15", "#ef4444"]);

    // ── Heatmap cells (hidden initially) ──
    const cells = g
      .selectAll<SVGRectElement, (typeof HEATMAP_DATA)[number]>("rect.cell")
      .data(HEATMAP_DATA)
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", (d) => xScale(d.decade)!)
      .attr("y", (d) => yHeat(d.industry)!)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("width", xScale.bandwidth())
      .attr("height", yHeat.bandwidth())
      .style("fill", (d) => color(d.value))
      .style("opacity", 0)
      .style("cursor", "pointer")
      .on("mouseover", function (e: MouseEvent, d) {
        if (allRefs.current?.morphProgress < 0.25) return;
        const el = tooltipRef?.current;
        if (!el) return;
        el.style.opacity = "1";
        el.innerHTML = `<b>${d.industry}</b> · ${d.decade}<br/>AI Intensity: <span style="color:${color(d.value)};font-weight:bold">${d.value.toFixed(3)}</span>`;
      })
      .on("mousemove", (e: MouseEvent) => {
        const el = tooltipRef?.current;
        if (!el) return;
        el.style.left = e.clientX + 15 + "px";
        el.style.top = e.clientY - 40 + "px";
      })
      .on("mouseleave", () => {
        const el = tooltipRef?.current;
        if (el) el.style.opacity = "0";
      });

    // ── Bars (visible initially, overlaid on heatmap columns) ──
    const bars = g
      .selectAll<SVGRectElement, (typeof DECADE_AVGS)[number]>("rect.bar")
      .data(DECADE_AVGS)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.decade)!)
      .attr("y", (d) => yBar(d.value))
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => heatH - yBar(d.value))
      .style("fill", (d) => color(d.value))
      .style("opacity", 1)
      .style("cursor", "pointer")
      .on("mouseover", function (e: MouseEvent, d) {
        if (allRefs.current?.morphProgress > 0.7) return;
        const el = tooltipRef?.current;
        if (!el) return;
        el.style.opacity = "1";
        el.innerHTML = `<b>${d.decade}</b><br/>Avg AI Intensity: <span style="color:${color(d.value)};font-weight:bold">${d.value.toFixed(3)}</span><br/>Across ${INDUSTRIES.length} industries`;
      })
      .on("mousemove", (e: MouseEvent) => {
        const el = tooltipRef?.current;
        if (!el) return;
        el.style.left = e.clientX + 15 + "px";
        el.style.top = e.clientY - 40 + "px";
      })
      .on("mouseleave", () => {
        const el = tooltipRef?.current;
        if (el) el.style.opacity = "0";
      });

    // ── X-axis (shared) ──
    const xAxisG = g
      .append("g")
      .attr("transform", `translate(0,${heatH})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .style("font-size", "13px");
    xAxisG.select(".domain").remove();

    // ── Y-axis: numeric (bar chart) ──
    const yAxisBar = g
      .append("g")
      .attr("class", "y-bar")
      .call(d3.axisLeft(yBar).ticks(5).tickSize(0))
      .style("font-size", "13px");
    yAxisBar.select(".domain").remove();

    // ── Y-axis: industry names (heatmap) ──
    const yAxisHeat = g
      .append("g")
      .attr("class", "y-heat")
      .call(d3.axisLeft(yHeat).tickSize(0))
      .style("font-size", "12px")
      .style("opacity", 0);
    yAxisHeat.select(".domain").remove();

    // ── Title: bar chart ──
    const titleBar = svg
      .append("text")
      .attr("x", svgW / 2)
      .attr("y", 32)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "900")
      .style("fill", "#ef4444")
      .text("Average Intensity Growth");

    // ── Title: heatmap ──
    const titleHeat = svg
      .append("text")
      .attr("x", svgW / 2)
      .attr("y", 32)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "900")
      .style("fill", "#0f172a")
      .text("General view of AI intensity change")
      .style("opacity", 0);

    // ── Legend (heatmap only) ──
    const legendG = g
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${heatW + 18}, 0)`)
      .style("opacity", 0);

    const legendScale = d3.scaleLinear().domain([0.1, 0.6]).range([heatH, 0]);
    legendG
      .selectAll("rect")
      .data(d3.range(0.1, 0.61, 0.01))
      .enter()
      .append("rect")
      .attr("y", (d) => legendScale(d))
      .attr("width", 12)
      .attr("height", heatH / 50)
      .style("fill", (d) => color(d));
    legendG
      .append("g")
      .attr("transform", "translate(12, 0)")
      .call(d3.axisRight(legendScale).ticks(5))
      .style("font-size", "10px")
      .select(".domain")
      .remove();

    // Store all refs
    allRefs.current = {
      bars,
      cells,
      yAxisBar,
      yAxisHeat,
      titleBar,
      titleHeat,
      legendG,
      yBar,
      heatH,
      color,
      morphProgress: 0,
    };
  }, [tooltipRef]);

  // ── Update on morph progress ──
  useEffect(() => {
    const r = allRefs.current;
    if (!r) return;
    r.morphProgress = morphProgress;
    const p = morphProgress;

    // Helper: map p through a window [pStart, pEnd] → [0, 1]
    const windowFn = (pStart: number, pEnd: number) => Math.min(1, Math.max(0, (p - pStart) / (pEnd - pStart)));

    // Bars: height tweak early, fade out mid
    const barHeightTweak = windowFn(0, 0.25);
    const barOpacity = 1 - windowFn(0.25, 0.65);

    r.bars
      .attr("y", (d) => {
        const base = r.yBar(d.value);
        const bump = barHeightTweak * 12 * (1 - DECADES.indexOf(d.decade) / 2);
        return Math.max(0, base - bump);
      })
      .attr("height", (d) => {
        const base = r.heatH - r.yBar(d.value);
        const bump = barHeightTweak * 12 * (1 - DECADES.indexOf(d.decade) / 2);
        return base + bump;
      })
      .style("opacity", barOpacity);

    // Cells: fade in
    const cellOpacity = windowFn(0.2, 0.7);
    r.cells.style("opacity", cellOpacity);

    // Y-axis crossfade
    const axisCross = windowFn(0.35, 0.7);
    r.yAxisBar.style("opacity", 1 - axisCross);
    r.yAxisHeat.style("opacity", axisCross);

    // Title crossfade
    const titleCross = windowFn(0.4, 0.75);
    r.titleBar.style("opacity", 1 - titleCross);
    r.titleHeat.style("opacity", titleCross);

    // Legend fade in
    const legendOp = windowFn(0.6, 1.0);
    r.legendG.style("opacity", legendOp);
  }, [morphProgress]);

  return <div ref={containerRef} style={{ width: "100%", maxWidth: "860px", height: "440px", minWidth: 0 }} />;
}

// ─── Salary by Industry Bar Chart (green→yellow→red) ───────
function SalaryByIndustryChart({
  visible,
  tooltipRef,
}: {
  visible: boolean;
  tooltipRef: React.RefObject<HTMLDivElement | null>;
}) {
  const svgRef = useRef<HTMLDivElement>(null);
  const hasDrawn = useRef(false);

  useEffect(() => {
    if (!visible || hasDrawn.current || !svgRef.current) return;
    hasDrawn.current = true;

    const container = svgRef.current;
    d3.select(container).selectAll("*").remove();

    const csvUrl = dbUrl("ai_impact_jobs_2010_2025.csv");
    const margin = { top: 40, right: 110, bottom: 25, left: 130 };
    const totalW = 620;
    const totalH = 380;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    d3.csv(csvUrl).then((raw) => {
      const grouped = d3.rollup(
        raw,
        (v) => ({
          avgSalary: d3.mean(v, (d) => +d.salary_usd),
          avgIntensity: d3.mean(v, (d) => +d.ai_intensity_score),
          count: v.length,
        }),
        (d) => d.industry,
      );

      const data = Array.from(grouped, ([industry, vals]) => ({
        industry,
        ...vals,
      })).sort((a, b) => b.avgSalary - a.avgSalary);

      const xMax = d3.max(data, (d) => d.avgSalary);
      const x = d3
        .scaleLinear()
        .domain([0, xMax! * 1.12])
        .range([0, width]);
      const y = d3
        .scaleBand()
        .domain(data.map((d) => d.industry))
        .range([0, height])
        .padding(0.25);

      // Color domain fixed to match heatmap: [0.1, 0.35, 0.6]
      // ✅ Color: green → yellow → red (matches heatmap)
      const colorScale = d3
        .scaleLinear()
        .domain([0.1, 0.35, 0.6])
        .range(["#22c55e", "#facc15", "#ef4444"]);

      const svg = d3
        .select(container)
        .append("svg")
        .attr("viewBox", `0 0 ${totalW} ${totalH}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .style("opacity", 0);

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      g.append("g").call(d3.axisLeft(y).tickSize(0)).style("font-size", "11px").select(".domain").remove();

      g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(
          d3
            .axisBottom(x)
            .ticks(4)
            .tickFormat((d) => `$${Math.round((d as number) / 1000)}k`),
        )
        .style("font-size", "11px")
        .select(".domain")
        .remove();

      g.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", (d) => y(d.industry))
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("width", 0)
        .attr("rx", 4)
        .attr("fill", (d) => colorScale(d.avgIntensity))
        .style("cursor", "pointer")
        .on("mouseover", (e: MouseEvent, d) => {
          const el = tooltipRef?.current;
          if (!el) return;
          el.style.opacity = "1";
          el.innerHTML = `<b>${d.industry}</b><br/>Avg Salary: $${Math.round(d.avgSalary).toLocaleString()}<br/>AI Intensity: ${d.avgIntensity.toFixed(2)}`;
        })
        .on("mousemove", (e: MouseEvent) => {
          const el = tooltipRef?.current;
          if (!el) return;
          el.style.left = e.clientX + 15 + "px";
          el.style.top = e.clientY - 40 + "px";
        })
        .on("mouseleave", () => {
          const el = tooltipRef?.current;
          if (el) el.style.opacity = "0";
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 60)
        .attr("width", (d) => x(d.avgSalary));

      g.append("text")
        .attr("x", width / 2)
        .attr("y", -16)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "700")
        .style("fill", "#0f172a")
        .text("AI intensity & salary across industries");

      const legendG = svg.append("g").attr("transform", `translate(${margin.left + width + 15}, ${margin.top})`);
      const legendH = height;
      const legendScale = d3.scaleLinear().domain([0.1, 0.6]).range([legendH, 0]);
      legendG
        .selectAll("rect")
        .data(d3.range(0.1, 0.61, 0.01))
        .enter()
        .append("rect")
        .attr("y", (d) => legendScale(d))
        .attr("width", 12)
        .attr("height", legendH / 30)
        .attr("fill", (d) => colorScale(d));
      legendG
        .append("g")
        .attr("transform", "translate(12,0)")
        .call(d3.axisRight(legendScale).ticks(5))
        .style("font-size", "10px")
        .select(".domain")
        .remove();

      svg.transition().duration(600).style("opacity", 1);
    });
  }, [visible, tooltipRef]);

  return <div ref={svgRef} style={{ width: "100%", maxWidth: "620px", height: "380px", minWidth: 0 }} />;
}

// ─── Roadmap Steps ──────────────────────────────────────────
const ROADMAP = [
  {
    icon: <Globe size={20} className="roadmap-icon-svg" />,
    question: "Where to work?",
    desc: "Global salary & AI intensity distribution across the world",
  },
  {
    icon: <DollarSign size={20} className="roadmap-icon-svg" />,
    question: "Which industry is better?",
    desc: "Compare across industries and see how AI intensity correlates with wages ",
  },
  {
    icon: < Briefcase size={20} className="roadmap-icon-svg" />,
    question: "Which job role is better?",
    desc: "Job openings analysis & our evaluation for job seekers",
  },
  {
    icon: <BarChart2 size={20} className="roadmap-icon-svg" />,
    question: "Job seeking guide under AI era?",
    desc: "Evaluate industries and countries based on multiple weighted factors",
  },
];

// ─── Stage 3: Roadmap ───────────────────────────────────────
function RoadmapView({ scrollPos }: { scrollPos: number }) {
  return (
    <div className="roadmap-container">
      <div className="roadmap-title">
        <span className="roadmap-title-highlight">To find a job</span> under AI era, you may wonder:
      </div>

      <div className="roadmap-track">
        <div className="roadmap-line" />

        {ROADMAP.map((item, i) => {
          const itemStart = i * 60;
          const opacity = scrollPos < itemStart ? 0 : scrollPos < itemStart + 50 ? (scrollPos - itemStart) / 50 : 1;
          const translateY =
            scrollPos < itemStart ? 16 : scrollPos < itemStart + 50 ? 16 * (1 - (scrollPos - itemStart) / 50) : 0;

          return (
            <div key={i} className="roadmap-node" style={{ opacity, transform: `translateY(${translateY}px)` }}>
              <div className="roadmap-badge">
                <span className="roadmap-icon">{item.icon}</span>
                <span className="roadmap-num">{i + 1}</span>
              </div>
              <div className="roadmap-card">
                <div className="roadmap-question">{item.question}</div>
                <div className="roadmap-desc">{item.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {scrollPos > 250 && (
        <div className="roadmap-scroll-hint">
          <span>Then, scroll down and explore with us</span>
          <span className="scroll-arrow">↓</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Introduction Component ────────────────────────────
function Introduction({
  scrollParentRef,
  onStageChange,
}: {
  scrollParentRef: React.RefObject<HTMLDivElement | null>;
  onStageChange?: (stage: number) => void;
}) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(() => {
    const h = scrollParentRef?.current?.clientHeight;
    if (h && h > 0) return h;
    return typeof window !== "undefined" ? window.innerHeight : 900;
  });

  // ── Scroll thresholds (all in px, relative to intro section) ──
  const vh = viewportHeight;

  // Stage 0: Hero
  const heroFadeEnd = 0.3 * vh;

  // Stage 1: Bar chart appear + hold
  const chartAppearStart = 0.35 * vh;
  const chartAppearEnd = 0.65 * vh;
  const morphStart = 1.0 * vh;
  const morphEnd = 2.6 * vh;

  // Stage 2: Salary chart
  const salarySlideStart = 3.0 * vh;
  const salarySlideEnd = 3.6 * vh;

  // Stage 3: Roadmap
  const roadmapSlideStart = 4.2 * vh;
  const roadmapSlideEnd = 4.8 * vh;
  const roadmapLocalStart = 5.0 * vh;

  // Total container height
  const HOLD_SEGMENTS = 7;
  const introContainerHeight = `calc(100vh + ${HOLD_SEGMENTS * 100}vh)`;

  useEffect(() => {
    const update = () => {
      const h = scrollParentRef?.current?.clientHeight;
      setViewportHeight(h && h > 0 ? h : window.innerHeight);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [scrollParentRef]);

  useEffect(() => {
    const container = scrollParentRef?.current;
    if (!container) return;
    const handle = () => {
      const intro = container.querySelector('[data-section="intro"]');
      if (!intro) return;
      const maxScroll = intro.offsetHeight - container.clientHeight;
      const pos = Math.min(Math.max(container.scrollTop - intro.offsetTop, 0), maxScroll);
      setScrollProgress(pos);
      if (onStageChange) {
        if (pos < chartAppearStart) onStageChange(0);
        else if (pos < salarySlideStart) onStageChange(1);
        else if (pos < roadmapSlideStart) onStageChange(2);
        else onStageChange(3);
      }
    };
    container.addEventListener("scroll", handle);
    handle();
    return () => container.removeEventListener("scroll", handle);
  }, [scrollParentRef, onStageChange, chartAppearStart, salarySlideStart, roadmapSlideStart]);

  // ── Derived values ──
  const heroOpacity = Math.max(0, 1 - scrollProgress / heroFadeEnd);

  const chartOpacity =
    scrollProgress < chartAppearStart
      ? 0
      : Math.min(1, (scrollProgress - chartAppearStart) / (chartAppearEnd - chartAppearStart));

  const morphProgress =
    scrollProgress < morphStart
      ? 0
      : scrollProgress < morphEnd
        ? (scrollProgress - morphStart) / (morphEnd - morphStart)
        : 1;

  // Stage 1 -> Stage 2: heatmap slides up, salary chart slides in from below
  const heatmapSlideUp =
    scrollProgress < salarySlideStart
      ? 0
      : Math.min(1, (scrollProgress - salarySlideStart) / (salarySlideEnd - salarySlideStart));
  const heatmapTranslateY = heatmapSlideUp * (-1.2 * vh);
  const heatmapSlideOpacity = scrollProgress < salarySlideStart ? 1 : Math.max(0, 1 - heatmapSlideUp * 1.5);

  const salarySlideProgress =
    scrollProgress < salarySlideStart
      ? 0
      : Math.min(1, (scrollProgress - salarySlideStart) / (salarySlideEnd - salarySlideStart));
  const salaryTranslateY = (1 - salarySlideProgress) * vh;
  const salarySlideOpacity = salarySlideProgress;

  // Stage 2 -> Stage 3: salary chart slides up, roadmap slides in from below
  const salarySlideOut =
    scrollProgress < roadmapSlideStart
      ? 0
      : Math.min(1, (scrollProgress - roadmapSlideStart) / (roadmapSlideEnd - roadmapSlideStart));
  const salaryOutTranslateY = salarySlideOut * (-1.2 * vh);
  const salaryOutOpacity = Math.max(0, 1 - salarySlideOut * 1.5);

  const roadmapSlideProgress =
    scrollProgress < roadmapSlideStart
      ? 0
      : Math.min(1, (scrollProgress - roadmapSlideStart) / (roadmapSlideEnd - roadmapSlideStart));
  const roadmapTranslateY = (1 - roadmapSlideProgress) * vh;
  const roadmapSlideOpacity = roadmapSlideProgress;
  const roadmapLocal = Math.max(0, scrollProgress - roadmapLocalStart);

  return (
    <div className="intro-container" data-section="intro" style={{ height: introContainerHeight }}>
      <div className="intro-sticky-viewport">
        {/* Stage 0 — Hero */}
        <div className="layer" style={{ opacity: heroOpacity }}>
          <span className="highlight-audience">Dear job seekers,</span>
          <p className="pre-intro-text">AI is reshaping the job market. Are you ready?</p>
        </div>

        {/* Stage 1 — Bar chart → Heatmap morph */}
        <div
          className="layer layer-chart-card"
          style={{
            opacity: chartOpacity * heatmapSlideOpacity,
            transform: `translateY(${heatmapTranslateY}px)`,
            pointerEvents: chartOpacity * heatmapSlideOpacity > 0.1 ? "auto" : "none",
          }}
        >
          <div className="charts-wrapper charts-wrapper-single">
            <AIIntensityHeatmap morphProgress={morphProgress} tooltipRef={tooltipRef} />
          </div>
        </div>

        {/* Stage 2 — Salary chart */}
        <div
          className="layer layer-chart-card"
          style={{
            opacity: salarySlideOpacity * salaryOutOpacity,
            transform: `translateY(${salaryTranslateY + salaryOutTranslateY}px)`,
            pointerEvents: salarySlideOpacity * salaryOutOpacity > 0.1 ? "auto" : "none",
          }}
        >
          <div className="charts-wrapper charts-wrapper-single">
            <SalaryByIndustryChart visible={salarySlideOpacity > 0.05} tooltipRef={tooltipRef} />
          </div>
        </div>

        {/* Stage 3 — Roadmap */}
        <div
          className="layer layer-roadmap"
          style={{
            opacity: roadmapSlideOpacity,
            transform: `translateY(${roadmapTranslateY}px)`,
            pointerEvents: roadmapSlideOpacity > 0.1 ? "auto" : "none",
          }}
        >
          <RoadmapView scrollPos={roadmapLocal} />
        </div>
      </div>

      {/* Shared tooltip */}
      <div ref={tooltipRef} className="chart-tooltip" />
    </div>
  );
}

export default Introduction;
