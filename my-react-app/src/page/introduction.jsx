import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import "./introduction.css";
import { Globe, Briefcase, DollarSign, BarChart2 } from "lucide-react";

// ─── Heatmap + BarChart Animation Component ─────────────────
function AIIntensityHeatmap({ showBarChart, tooltipRef }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current).selectAll("*").remove();

    const svgW = 1100;
    const svgH = 450;
    const heatW = 380;
    const heatH = 320;
    const barW = 300;
    const barH = 320;

    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("viewBox", `-100 0 ${svgW} ${svgH}`)
      .attr("width", "100%")
      .attr("height", "100%");

    const industries = ["Agriculture", "Education", "Energy", "Finance", "Government", "Healthcare", "Manufacturing", "Retail", "Tech"];
    const decades = ["2010-2014", "2015-2019", "2020-2025"];
    const data = [];
    const decadeSums = { "2010-2014": 0, "2015-2019": 0, "2020-2025": 0 };

    industries.forEach(ind => decades.forEach((dec, i) => {
      const val = 0.1 + i * 0.15 + Math.random() * 0.15;
      data.push({ industry: ind, decade: dec, value: val });
      decadeSums[dec] += val;
    }));

    const decadeAvgs = decades.map(dec => ({
      decade: dec,
      value: decadeSums[dec] / industries.length
    }));

    const xHeat = d3.scaleBand().range([0, heatW]).domain(decades).padding(0.08);
    const yHeat = d3.scaleBand().range([heatH, 0]).domain([...industries].reverse()).padding(0.08);
    const color = d3.scaleLinear().domain([0.1, 0.35, 0.6]).range(["#22c55e", "#facc15", "#ef4444"]);

    const xBar = d3.scaleBand().range([0, barW]).domain(decades).padding(0.3);
    const yBar = d3.scaleLinear().domain([0, 0.6]).range([barH, 0]);

    const gHeat = svg.append("g").attr("class", "g-heat").attr("transform", "translate(240, 60)");
    const gBar = svg.append("g").attr("class", "g-bar").attr("transform", "translate(640, 60)").style("opacity", 0);
    const gFly = svg.append("g").attr("class", "g-fly");

    gHeat.selectAll("rect.cell")
      .data(data).enter().append("rect")
      .attr("x", d => xHeat(d.decade)).attr("y", d => yHeat(d.industry))
      .attr("rx", 4).attr("ry", 4)
      .attr("width", xHeat.bandwidth()).attr("height", yHeat.bandwidth())
      .style("fill", d => color(d.value))
      .style("cursor", "pointer")
      .on("mouseover", (e, d) => {
        const el = tooltipRef?.current; if (!el) return;
        el.style.opacity = "1";
        el.innerHTML = `<b>${d.industry}</b> · ${d.decade}<br/>AI Intensity: <span style="color:${color(d.value)};font-weight:bold">${d.value.toFixed(3)}</span>`;
      })
      .on("mousemove", (e) => {
        const el = tooltipRef?.current; if (!el) return;
        el.style.left = (e.clientX + 15) + "px";
        el.style.top = (e.clientY - 40) + "px";
      })
      .on("mouseleave", () => { const el = tooltipRef?.current; if (el) el.style.opacity = "0"; });

    gHeat.append("g").attr("transform", `translate(0,${heatH})`).call(d3.axisBottom(xHeat).tickSize(0)).style("font-size","13px").select(".domain").remove();
    gHeat.append("g").call(d3.axisLeft(yHeat).tickSize(0)).style("font-size","13px").select(".domain").remove();
    gHeat.append("text").attr("x", heatW/2).attr("y", -30).attr("text-anchor", "middle").style("font-size","16px").style("font-weight","900").text("General view of AI intensity change");

    const lg = gHeat.append("g").attr("transform", `translate(${heatW + 20},0)`);
    const ly = d3.scaleLinear().domain([0.1, 0.6]).range([heatH, 0]);
    lg.selectAll("rect").data(d3.range(0.1, 0.61, 0.01)).enter().append("rect")
      .attr("y", d => ly(d)).attr("width", 12).attr("height", heatH / 50).style("fill", d => color(d));
    lg.append("g").attr("transform", "translate(12,0)").call(d3.axisRight(ly).ticks(5)).select(".domain").remove();

    gBar.append("g").attr("transform", `translate(0,${barH})`).call(d3.axisBottom(xBar)).style("font-size","13px");
    gBar.append("g").call(d3.axisLeft(yBar).ticks(5)).style("font-size","13px");
    gBar.append("text").attr("x", barW/2).attr("y", -30).attr("text-anchor", "middle").style("font-size","16px").style("font-weight","900").style("fill","#ef4444").text("Average Intensity Growth");

    svg.append("defs").append("marker").attr("id", "arrowhead").attr("viewBox", "0 -5 10 10").attr("refX", 8).attr("refY", 0).attr("orient", "auto").attr("markerWidth", 6).attr("markerHeight", 6).append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#ef4444");

    svgRef.current = { gHeat, gBar, gFly, decadeAvgs, xHeat, xBar, yBar, color, barH, industries };
  }, [tooltipRef]);

  useEffect(() => {
    if (!svgRef.current) return;
    const { gHeat, gBar, gFly, decadeAvgs, xHeat, xBar, yBar, color, barH, industries } = svgRef.current;

    if (showBarChart && !hasAnimated.current) {
      hasAnimated.current = true;
      gHeat.transition().duration(1000).attr("transform", "translate(140, 60)");
      gBar.transition().delay(500).duration(500).style("opacity", 1);
      gFly.selectAll("rect.fly").data(decadeAvgs).enter().append("rect").attr("class","fly")
        .attr("fill", d => color(d.value)).attr("rx", 4)
        .attr("x", d => 140 + xHeat(d.decade)).attr("y", 60)
        .attr("width", xHeat.bandwidth()).attr("height", 320).style("opacity", 0.7)
        .style("cursor", "pointer")
        .on("mouseover", (e, d) => {
          const el = tooltipRef?.current;
          if (!el) return;
          el.style.opacity = "1";
          el.innerHTML = `<b>${d.decade}</b><br/>Avg AI Intensity: <span style="color:${color(d.value)};font-weight:bold">${d.value.toFixed(3)}</span><br/>Across ${industries.length} industries`;
        })
        .on("mousemove", (e) => {
          const el = tooltipRef?.current;
          if (!el) return;
          el.style.left = (e.clientX + 15) + "px";
          el.style.top = (e.clientY - 40) + "px";
        })
        .on("mouseleave", () => { if (tooltipRef?.current) tooltipRef.current.style.opacity = "0"; })
        .transition().delay(1000).duration(1200)
        .attr("x", d => 640 + xBar(d.decade))
        .attr("y", d => 60 + yBar(d.value))
        .attr("width", xBar.bandwidth())
        .attr("height", d => barH - yBar(d.value));
      const line = d3.line().x(d => 640 + xBar(d.decade) + xBar.bandwidth()/2).y(d => 60 + yBar(d.value)).curve(d3.curveMonotoneX);
      const path = gFly.append("path").attr("d", line(decadeAvgs)).attr("fill", "none").attr("stroke", "#ef4444").attr("stroke-width", 3).attr("marker-end", "url(#arrowhead)");
      const len = path.node().getTotalLength();
      path.attr("stroke-dasharray", len).attr("stroke-dashoffset", len).transition().delay(2200).duration(1000).attr("stroke-dashoffset", 0);
    }
  }, [showBarChart]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", maxWidth: "900px", height: "450px", minWidth: 0, flex: "1 1 0" }}
    />
  );
}

// ─── Salary by Industry Bar Chart (colored by AI intensity) ──
function SalaryByIndustryChart({ visible, tooltipRef }) {
  const svgRef = useRef(null);
  const hasDrawn = useRef(false);

  useEffect(() => {
    if (!visible || hasDrawn.current || !svgRef.current) return;
    hasDrawn.current = true;

    const container = svgRef.current;
    d3.select(container).selectAll("*").remove();

    const csvUrl = "/ai_impact_jobs_2010_2025.csv";
    const margin = { top: 40, right: 110, bottom: 25, left: 130 };
    const totalW = 510;
    const totalH = 380;
    const width = totalW - margin.left - margin.right;
    const height = totalH - margin.top - margin.bottom;

    d3.csv(csvUrl).then(raw => {
      const grouped = d3.rollup(
        raw,
        v => ({
          avgSalary: d3.mean(v, d => +d.salary_usd),
          avgIntensity: d3.mean(v, d => +d.ai_intensity_score),
          count: v.length,
        }),
        d => d.industry
      );

      const data = Array.from(grouped, ([industry, vals]) => ({
        industry,
        ...vals,
      })).sort((a, b) => b.avgSalary - a.avgSalary);

      const xMax = d3.max(data, d => d.avgSalary);
      const x = d3.scaleLinear().domain([0, xMax * 1.12]).range([0, width]);
      const y = d3.scaleBand().domain(data.map(d => d.industry)).range([0, height]).padding(0.25);

      const [iMin, iMax] = d3.extent(data, d => d.avgIntensity);
      const colorScale = d3.scaleLinear()
        .domain([iMin, (iMin + iMax) / 2, iMax])
        .range(["#fca5a5", "#ef4444", "#7f1d1d"]);

      const svg = d3.select(container)
        .append("svg")
        .attr("viewBox", `0 0 ${totalW} ${totalH}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .style("opacity", 0);

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      g.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .style("font-size", "11px")
        .select(".domain").remove();

      g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(4).tickFormat(d => `$${Math.round(d / 1000)}k`))
        .style("font-size", "11px")
        .select(".domain").remove();

      g.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.industry))
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("width", 0)
        .attr("rx", 4)
        .attr("fill", d => colorScale(d.avgIntensity))
        .style("cursor", "pointer")
        .on("mouseover", (e, d) => {
          const el = tooltipRef?.current; if (!el) return;
          el.style.opacity = "1";
          el.innerHTML = `<b>${d.industry}</b><br/>Avg Salary: $${Math.round(d.avgSalary).toLocaleString()}<br/>AI Intensity: ${d.avgIntensity.toFixed(2)}`;
        })
        .on("mousemove", (e) => {
          const el = tooltipRef?.current; if (!el) return;
          el.style.left = (e.clientX + 15) + "px";
          el.style.top = (e.clientY - 40) + "px";
        })
        .on("mouseleave", () => { const el = tooltipRef?.current; if (el) el.style.opacity = "0"; })
        .transition()
        .duration(800)
        .delay((d, i) => i * 60)
        .attr("width", d => x(d.avgSalary));

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
      const legendScale = d3.scaleLinear().domain([iMin, iMax]).range([legendH, 0]);
      legendG.selectAll("rect").data(d3.range(iMin, iMax + 0.01, (iMax - iMin) / 30)).enter().append("rect")
        .attr("y", d => legendScale(d)).attr("width", 12).attr("height", legendH / 30)
        .attr("fill", d => colorScale(d));
      legendG.append("g").attr("transform", "translate(12,0)")
        .call(d3.axisRight(legendScale).ticks(5))
        .style("font-size", "10px")
        .select(".domain").remove();

      svg.transition().duration(600).style("opacity", 1);
    });
  }, [visible, tooltipRef]);

  return (
    <div
      ref={svgRef}
      style={{ width: "100%", maxWidth: "510px", height: "380px", minWidth: 0 }}
    />
  );
}

// ─── Roadmap Steps ──────────────────────────────────────────
const ROADMAP = [
  {
    icon: <Globe size={20} className="roadmap-icon-svg" />,
    question: "Where to work?",
    desc: "Global salary & AI intensity distribution across 10 major tech economies",
  },
  {
    icon: <Briefcase size={20} className="roadmap-icon-svg" />,
    question: "Which industry is better?",
    desc: "How different sectors have evolved over the past decade",
  },
  {
    icon: <DollarSign size={20} className="roadmap-icon-svg" />,
    question: "Does AI really impact salary?",
    desc: "How AI intensity correlates with wages across industries",
  },
  {
    icon: <BarChart2 size={20} className="roadmap-icon-svg" />,
    question: "Which roles have more openings?",
    desc: "Job openings analysis & our evaluation for job seekers",
  },
];

// ─── Stage 3: Roadmap ───────────────────────────────────────
function RoadmapView({ scrollPos }) {
  // Each item fades in over a 50px scroll range, staggered by 60px
  return (
    <div className="roadmap-container">
      <div className="roadmap-title">
        <span className="roadmap-title-highlight">To find a job</span>{" "}
        under AI era, you may wonder:
      </div>

      <div className="roadmap-track">
        {/* Vertical connecting line */}
        <div className="roadmap-line" />

        {ROADMAP.map((item, i) => {
          const itemStart = i * 60;
          const opacity = scrollPos < itemStart ? 0 : scrollPos < itemStart + 50
            ? (scrollPos - itemStart) / 50
            : 1;
          const translateY = scrollPos < itemStart ? 16 : scrollPos < itemStart + 50
            ? 16 * (1 - (scrollPos - itemStart) / 50)
            : 0;

          return (
            <div
              key={i}
              className="roadmap-node"
              style={{ opacity, transform: `translateY(${translateY}px)` }}
            >
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

      {/* Scroll prompt */}
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
function Introduction({ scrollParentRef, onStageChange }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const tooltipRef = useRef(null);
  const [viewportHeight, setViewportHeight] = useState(() => {
    const h = scrollParentRef?.current?.clientHeight;
    if (h && h > 0) return h;
    return typeof window !== "undefined" ? window.innerHeight : 900;
  });

  const GRAPH_HOLD_FACTOR = 1.2; // 120vh
  const INTRO_HERO_OFFSET_FACTOR = 0.25;
  const HOLD_SEGMENTS = 4;

  const graphHoldPx = viewportHeight * GRAPH_HOLD_FACTOR;
  const contentStartPx = viewportHeight * INTRO_HERO_OFFSET_FACTOR;
  const barChartStartPx = contentStartPx + graphHoldPx;
  const salaryChartStartPx = barChartStartPx + graphHoldPx;
  const roadmapStartPx = salaryChartStartPx + graphHoldPx;
  const stage2FadeSpanPx = viewportHeight * 0.35;
  const stage3LocalStartPx = roadmapStartPx + viewportHeight * 0.12;
  const introContainerHeight = `calc(100vh + ${HOLD_SEGMENTS * 120}vh)`;

  useEffect(() => {
    const updateViewportHeight = () => {
      const h = scrollParentRef?.current?.clientHeight;
      setViewportHeight(h && h > 0 ? h : window.innerHeight);
    };

    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    return () => window.removeEventListener("resize", updateViewportHeight);
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
        if (pos < contentStartPx) onStageChange(0);
        else if (pos < salaryChartStartPx) onStageChange(1);
        else if (pos < roadmapStartPx) onStageChange(2);
        else onStageChange(3);
      }
    };
    container.addEventListener("scroll", handle);
    handle();
    return () => container.removeEventListener("scroll", handle);
  }, [scrollParentRef, onStageChange, contentStartPx, salaryChartStartPx, roadmapStartPx]);

  // Stage 0
  const s0Opacity = Math.max(0, 1 - scrollProgress / (viewportHeight * 0.2));

  // Stage 1 + 2
  const contentOpacity = scrollProgress < contentStartPx
    ? 0
    : Math.min(1, (scrollProgress - contentStartPx) / (viewportHeight * 0.2));
  const showBarChart = scrollProgress >= barChartStartPx;
  const salaryChartVisible = scrollProgress >= salaryChartStartPx;

  // Stage 3: stage 2 fades out, roadmap fades in
  const stage2Fade = scrollProgress < roadmapStartPx
    ? 1
    : Math.max(0, 1 - (scrollProgress - roadmapStartPx) / stage2FadeSpanPx);
  const stage3Local = Math.max(0, scrollProgress - stage3LocalStartPx); // 0-based progress within stage 3

  return (
    <div className="intro-container" data-section="intro" style={{ height: introContainerHeight }}>
      <div className="intro-sticky-viewport">
        {/* Stage 0 */}
        <div className="layer" style={{ opacity: s0Opacity }}>
          <span className="highlight-audience">Dear job seekers,</span>
          <p className="pre-intro-text">AI is reshaping the job market. Are you ready?</p>
        </div>

        {/* Stage 1 + 2 — combined in one card */}
        <div className="layer stage-content" style={{ opacity: contentOpacity * stage2Fade, pointerEvents: contentOpacity * stage2Fade > 0.1 ? 'auto' : 'none' }}>
          <div className="charts-wrapper">
            <AIIntensityHeatmap showBarChart={showBarChart} tooltipRef={tooltipRef} />
            <div className={`chart-right ${salaryChartVisible ? 'visible' : ''}`}>
              <SalaryByIndustryChart visible={salaryChartVisible} tooltipRef={tooltipRef} />
            </div>
          </div>
        </div>

        {/* Stage 3 — Roadmap */}
        <div className="layer layer-roadmap" style={{ opacity: 1 - stage2Fade, pointerEvents: 1 - stage2Fade > 0.1 ? 'auto' : 'none' }}>
          <RoadmapView scrollPos={stage3Local} />
        </div>
      </div>

      {/* Shared tooltip */}
      <div ref={tooltipRef} className="chart-tooltip" />
    </div>
  );
}

export default Introduction;
