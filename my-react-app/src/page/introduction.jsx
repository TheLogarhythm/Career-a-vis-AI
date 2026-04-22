import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import WordCloud from "wordcloud";
import "./introduction.css";

// ─── Heatmap ─────────────────────────────────────────────
function AIIntensityHeatmap() {
  const containerRef = useRef(null);
  const tooltipRef   = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current).selectAll("*").remove();

    // 居中大图尺寸
    const margin = { top: 60, right: 100, bottom: 60, left: 120 };
    const W = 650 - margin.left - margin.right;
    const H = 450 - margin.top  - margin.bottom;

    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("width",  W + margin.left + margin.right)
      .attr("height", H + margin.top  + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const industries = ["Agriculture","Education","Energy","Finance","Government","Healthcare","Manufacturing","Retail","Tech"];
    const decades    = ["2010-2014","2015-2019","2020-2025"];
    const data = [];
    industries.forEach(ind => decades.forEach((dec, i) => {
      data.push({ industry: ind, decade: dec, value: 0.1 + i*0.15 + Math.random()*0.15 });
    }));

    const x = d3.scaleBand().range([0, W]).domain(decades).padding(0.08);
    const y = d3.scaleBand().range([H, 0]).domain([...industries].reverse()).padding(0.08);
    const color = d3.scaleLinear().domain([0.1,0.35,0.6]).range(["#22c55e","#facc15","#ef4444"]);
    const tooltipEl = tooltipRef.current;

    svg.append("g").attr("transform",`translate(0,${H})`).call(d3.axisBottom(x).tickSize(0)).style("font-size","14px").select(".domain").remove();
    svg.append("g").call(d3.axisLeft(y).tickSize(0)).style("font-size","14px").select(".domain").remove();

    svg.selectAll("rect.cell")
      .data(data).enter().append("rect")
      .attr("class","cell")
      .attr("x", d => x(d.decade)).attr("y", d => y(d.industry))
      .attr("rx",4).attr("ry",4)
      .attr("width", x.bandwidth()).attr("height", y.bandwidth())
      .style("fill", d => color(d.value))
      .on("mouseover", function(event, d) {
        d3.select(this).style("stroke","#334155").style("stroke-width",3);
        tooltipEl.style.opacity = "1";
        tooltipEl.innerHTML = `<b>${d.industry}</b><br/>Value: <span style="color:${color(d.value)};font-weight:700">${d.value.toFixed(3)}</span>`;
      })
      .on("mousemove", function(event) {
        tooltipEl.style.left = (event.clientX + 15) + "px";
        tooltipEl.style.top  = (event.clientY - 40) + "px";
      })
      .on("mouseleave", function() {
        d3.select(this).style("stroke","none");
        tooltipEl.style.opacity = "0";
      });

    // Title inside SVG
    svg.append("text")
      .attr("x", W / 2).attr("y", -30).attr("text-anchor", "middle")
      .style("font-size", "18px").style("font-weight", "900").style("fill", "#0f172a")
      .text("General view of AI intensity change on job market across industries");

    // Legend
    const lg = svg.append("g").attr("transform",`translate(${W+30},0)`);
    const ly = d3.scaleLinear().domain([0.1,0.6]).range([H,0]);
    lg.selectAll("rect").data(d3.range(0.1,0.61,0.01)).enter().append("rect")
      .attr("y", d => ly(d)).attr("width",12).attr("height", H/50).style("fill", d => color(d));
    lg.append("g").attr("transform","translate(12,0)").call(d3.axisRight(ly).ticks(5)).select(".domain").remove();
  }, []);

  return <div className="heatmap-wrapper"><div ref={containerRef} className="intro-heatmap-viz" /><div ref={tooltipRef} className="heatmap-tooltip" /></div>;
}

// ─── Introduction ─────────────────────────────────────────
function Introduction({ scrollParentRef, onStageChange }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const canvasRef = useRef(null);
  const cloudGenerated = useRef(false);

  const HIGHLIGHTS = new Set(["Automation Risk", "Job Opening", "AI Exposure", "Wage Premium"]);
  const cloudList = [
    ["Automation Risk", 100], ["Job Opening", 95], ["AI Exposure", 92], ["Wage Premium", 88],
    ["Future of Work", 78], ["Job Market", 75], ["AI Revolution", 70], ["Worker Impact", 65],
    ["Augmentation", 62], ["Productivity", 58], ["Displacement", 55], ["Reskilling", 52],
    ["Skills Gap", 50], ["Digital Shift", 48], ["AI Literacy", 45], ["New Roles", 42],
    ["Innovation", 38], ["Algorithms", 36], ["Employment", 34], ["Workforce", 32],
    ["Technology", 30], ["Economy", 28], ["Adaptability", 26], ["Analytics", 24],
    ["Intelligence", 20], ["Soft Skills", 18], ["Upskilling", 17],
  ];
  const palette = ["#2563eb", "#7c3aed", "#0891b2", "#4f46e5", "#0f172a"];

  useEffect(() => {
    if (!canvasRef.current || cloudGenerated.current) return;
    WordCloud(canvasRef.current, {
      list: cloudList,
      gridSize: 6, weightFactor: 1.05, fontFamily: "Inter", fontWeight: "700",
      color: (word) => HIGHLIGHTS.has(word) ? "#ef4444" : palette[Math.floor(Math.random() * palette.length)],
      rotateRatio: 0.25, backgroundColor: "transparent", shape: "circle", shrinkToFit: true,
    });
    cloudGenerated.current = true;
  }, []);

  useEffect(() => {
    const container = scrollParentRef?.current;
    if (!container) return;
    const handle = () => {
      const intro = container.querySelector('[data-section="intro"]');
      if (!intro) return;
      const pos = Math.min(Math.max(container.scrollTop - intro.offsetTop, 0), 200);
      setScrollProgress(pos);
      if (onStageChange) {
        if (pos < 50) onStageChange(0);
        else if (pos < 200) onStageChange(1);
        else onStageChange(2);
      }
    };
    container.addEventListener("scroll", handle);
    return () => container.removeEventListener("scroll", handle);
  }, [scrollParentRef, onStageChange]);

  const s0Opacity = Math.max(0, 1 - scrollProgress / 40);
  const cloudOpacity = scrollProgress < 30 ? 0 : scrollProgress < 120 ? 1 : Math.max(0, 1 - (scrollProgress - 120) / 40);
  const contentOpacity = scrollProgress < 140 ? 0 : Math.min(1, (scrollProgress - 140) / 40);

  return (
    <div className="intro-container" data-section="intro">
      <div className="intro-sticky-viewport">
        {/* Stage 0 ─ 引导语 */}
        <div className="layer" style={{ opacity: s0Opacity }}>
          <span className="highlight-audience">Dear job seekers,</span>
          <p className="pre-intro-text">AI is reshaping the job market. Are you ready?</p>
        </div>

        {/* Stage 1 ─ 词云 */}
        <div className="layer stage-cloud" style={{ opacity: cloudOpacity }}>
          <h2 className="cloud-title">Key words when people talked about "Job and AI"</h2>
          <div className="cloud-canvas-wrap">
            <canvas ref={canvasRef} width="900" height="500" className="intro-cloud-canvas" />
          </div>
          <div className="cloud-sources">
            <span className="cloud-src-label">Sources:</span>
            <a className="cloud-src-link" href="https://www.pwc.com/gx/en/issues/artificial-intelligence/job-barometer/2025/methodology-report.pdf" target="_blank" rel="noreferrer">PwC</a>
            <span className="cloud-src-sep">·</span>
            <a className="cloud-src-link" href="https://www.mckinsey.com" target="_blank" rel="noreferrer">McKinsey</a>
            <span className="cloud-src-sep">·</span>
            <a className="cloud-src-link" href="https://www.oecd.org" target="_blank" rel="noreferrer">OECD</a>
          </div>
        </div>

        {/* Stage 2 ─ 详情 (现在仅保留居中的热力图) */}
        <div className="layer stage-content" style={{ opacity: contentOpacity, pointerEvents: contentOpacity > 0.1 ? 'auto' : 'none' }}>
          <div className="heatmap-centered-wrapper">
             <AIIntensityHeatmap />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Introduction;
