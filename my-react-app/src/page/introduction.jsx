import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import WordCloud from "wordcloud";
import "./introduction.css";

// ─── Heatmap + BarChart Animation Component ─────────────────
function AIIntensityHeatmap({ showBarChart }) {
  const containerRef = useRef(null);
  const tooltipRef   = useRef(null);
  const svgRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current).selectAll("*").remove();

    const svgW = 900;
    const svgH = 450;
    const heatW = 380;
    const heatH = 320;
    const barW = 300;
    const barH = 320;

    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("viewBox", `0 0 ${svgW} ${svgH}`)
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

    // Groups
    const gHeat = svg.append("g").attr("class", "g-heat").attr("transform", "translate(240, 60)");
    const gBar = svg.append("g").attr("class", "g-bar").attr("transform", "translate(550, 60)").style("opacity", 0);
    const gFly = svg.append("g").attr("class", "g-fly");

    const tooltipEl = tooltipRef.current;

    // Heatmap Cells
    gHeat.selectAll("rect.cell")
      .data(data).enter().append("rect")
      .attr("x", d => xHeat(d.decade)).attr("y", d => yHeat(d.industry))
      .attr("rx", 4).attr("ry", 4)
      .attr("width", xHeat.bandwidth()).attr("height", yHeat.bandwidth())
      .style("fill", d => color(d.value))
      .style("cursor", "pointer")
      .on("mouseover", (e, d) => {
        tooltipEl.style.opacity = "1";
        tooltipEl.innerHTML = `<b>${d.industry}</b><br/>Value: <span style="color:${color(d.value)};font-weight:bold">${d.value.toFixed(3)}</span>`;
      })
      .on("mousemove", (e) => {
        tooltipEl.style.left = (e.clientX + 15) + "px";
        tooltipEl.style.top = (e.clientY - 40) + "px";
      })
      .on("mouseleave", () => tooltipEl.style.opacity = "0");

    // Heatmap Axes
    gHeat.append("g").attr("transform", `translate(0,${heatH})`).call(d3.axisBottom(xHeat).tickSize(0)).style("font-size","13px").select(".domain").remove();
    gHeat.append("g").call(d3.axisLeft(yHeat).tickSize(0)).style("font-size","13px").select(".domain").remove();
    gHeat.append("text").attr("x", heatW/2).attr("y", -30).attr("text-anchor", "middle").style("font-size","16px").style("font-weight","900").text("General view of AI intensity change");

    // Heatmap Legend
    const lg = gHeat.append("g").attr("transform", `translate(${heatW + 20},0)`);
    const ly = d3.scaleLinear().domain([0.1, 0.6]).range([heatH, 0]);
    lg.selectAll("rect").data(d3.range(0.1, 0.61, 0.01)).enter().append("rect")
      .attr("y", d => ly(d)).attr("width", 12).attr("height", heatH / 50).style("fill", d => color(d));
    lg.append("g").attr("transform", "translate(12,0)").call(d3.axisRight(ly).ticks(5)).select(".domain").remove();

    // Bar Chart Axes
    gBar.append("g").attr("transform", `translate(0,${barH})`).call(d3.axisBottom(xBar)).style("font-size","13px");
    gBar.append("g").call(d3.axisLeft(yBar).ticks(5)).style("font-size","13px");
    gBar.append("text").attr("x", barW/2).attr("y", -30).attr("text-anchor", "middle").style("font-size","16px").style("font-weight","900").style("fill","#ef4444").text("Average Intensity Growth");

    svg.append("defs").append("marker").attr("id", "arrowhead").attr("viewBox", "0 -5 10 10").attr("refX", 8).attr("refY", 0).attr("orient", "auto").attr("markerWidth", 6).attr("markerHeight", 6).append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#ef4444");

    svgRef.current = { gHeat, gBar, gFly, decadeAvgs, xHeat, xBar, yBar, color, heatH, barH };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const { gHeat, gBar, gFly, decadeAvgs, xHeat, xBar, yBar, color, barH } = svgRef.current;

    if (showBarChart && !hasAnimated.current) {
      hasAnimated.current = true;
      gHeat.transition().duration(1000).attr("transform", "translate(40, 60)");
      gBar.transition().delay(500).duration(500).style("opacity", 1);
      gFly.selectAll("rect.fly").data(decadeAvgs).enter().append("rect").attr("class","fly")
        .attr("fill", d => color(d.value)).attr("rx", 4)
        .attr("x", d => 40 + xHeat(d.decade)).attr("y", 60)
        .attr("width", xHeat.bandwidth()).attr("height", 320).style("opacity", 0.7)
        .transition().delay(1000).duration(1200)
        .attr("x", d => 550 + xBar(d.decade))
        .attr("y", d => 60 + yBar(d.value))
        .attr("width", xBar.bandwidth())
        .attr("height", d => barH - yBar(d.value));
      const line = d3.line().x(d => 550 + xBar(d.decade) + xBar.bandwidth()/2).y(d => 60 + yBar(d.value)).curve(d3.curveMonotoneX);
      const path = gFly.append("path").attr("d", line(decadeAvgs)).attr("fill", "none").attr("stroke", "#ef4444").attr("stroke-width", 3).attr("marker-end", "url(#arrowhead)");
      const len = path.node().getTotalLength();
      path.attr("stroke-dasharray", len).attr("stroke-dashoffset", len).transition().delay(2200).duration(1000).attr("stroke-dashoffset", 0);
    }
  }, [showBarChart]);

  return (
    <div className="heatmap-wrapper">
      <div ref={containerRef} style={{ width: "900px", height: "450px" }} />
      <div ref={tooltipRef} className="heatmap-tooltip" />
    </div>
  );
}

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
    ["Collaboration", 22], ["Intelligence", 20], ["Soft Skills", 18], ["Upskilling", 17]
  ];
  const palette = ["#2563eb", "#7c3aed", "#0891b2", "#4f46e5", "#0f172a"];

  useEffect(() => {
    if (!canvasRef.current || cloudGenerated.current) return;
    WordCloud(canvasRef.current, {
      list: cloudList,
      gridSize: 6, weightFactor: 1.2, fontFamily: "'Inter','Impact',sans-serif", fontWeight: "700",
      color: (word) => HIGHLIGHTS.has(word) ? "#ef4444" : palette[Math.floor(Math.random() * palette.length)],
      rotateRatio: 0.3, backgroundColor: "transparent", shape: "circle", shrinkToFit: true,
    });
    cloudGenerated.current = true;
  }, []);

  useEffect(() => {
    const container = scrollParentRef?.current;
    if (!container) return;
    const handle = () => {
      const intro = container.querySelector('[data-section="intro"]');
      if (!intro) return;
      const pos = Math.min(Math.max(container.scrollTop - intro.offsetTop, 0), 600);
      setScrollProgress(pos);
      if (onStageChange) {
        if (pos < 60) onStageChange(0);
        else if (pos < 250) onStageChange(1);
        else onStageChange(2);
      }
    };
    container.addEventListener("scroll", handle);
    return () => container.removeEventListener("scroll", handle);
  }, [scrollParentRef, onStageChange]);

  const s0Opacity = Math.max(0, 1 - scrollProgress / 50);
  const cloudOpacity = scrollProgress < 40 ? 0 : scrollProgress < 200 ? 1 : Math.max(0, 1 - (scrollProgress - 200) / 60);
  const contentOpacity = scrollProgress < 240 ? 0 : Math.min(1, (scrollProgress - 240) / 60);
  const showBarChart = scrollProgress > 450;

  return (
    <div className="intro-container" data-section="intro">
      <div className="intro-sticky-viewport">
        {/* Stage 0 */}
        <div className="layer" style={{ opacity: s0Opacity }}>
          <span className="highlight-audience">Dear job seekers,</span>
          <p className="pre-intro-text">AI is reshaping the job market. Are you ready?</p>
        </div>

        {/* Stage 1 */}
        <div className="layer stage-cloud" style={{ opacity: cloudOpacity }}>
          <h2 className="cloud-title">Key words when people talked about "Job and AI"</h2>
          <canvas ref={canvasRef} width="900" height="500" />
          <div className="cloud-sources">
            <span className="cloud-src-label">Sources:</span>
            <a className="cloud-src-link" href="https://www.pwc.com/gx/en/issues/artificial-intelligence/job-barometer/2025/methodology-report.pdf" target="_blank" rel="noreferrer">PwC,</a>
            <a className="cloud-src-link" href="https://www.mckinsey.com" target="_blank" rel="noreferrer">McKinsey,</a>
            <a className="cloud-src-link" href="https://www.oecd.org" target="_blank" rel="noreferrer">OECD</a>
          </div>
        </div>

        {/* Stage 2 */}
        <div className="layer stage-content" style={{ opacity: contentOpacity, pointerEvents: contentOpacity > 0.1 ? 'auto' : 'none' }}>
           <AIIntensityHeatmap showBarChart={showBarChart} />
        </div>
      </div>
    </div>
  );
}

export default Introduction;
