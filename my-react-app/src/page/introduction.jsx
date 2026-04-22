import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import WordCloud from "wordcloud";
import "./introduction.css";

function AIIntensityHeatmap() {
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    d3.select(containerRef.current).selectAll("*").remove();

    const margin = { top: 30, right: 80, bottom: 40, left: 100 };
    const W = 500 - margin.left - margin.right;
    const H = 350 - margin.top - margin.bottom;

    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("width", W + margin.left + margin.right)
      .attr("height", H + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const industries = ["Agriculture", "Education", "Energy", "Finance", "Government", "Healthcare", "Manufacturing", "Retail", "Tech"];
    const decades = ["2010-2014", "2015-2019", "2020-2025"];
    const data = [];
    industries.forEach(ind => decades.forEach((dec, i) => {
      data.push({ industry: ind, decade: dec, value: 0.1 + i * 0.15 + Math.random() * 0.15 });
    }));

    const x = d3.scaleBand().range([0, W]).domain(decades).padding(0.05);
    const y = d3.scaleBand().range([H, 0]).domain([...industries].reverse()).padding(0.05);
    const color = d3.scaleLinear().domain([0.1, 0.35, 0.6]).range(["#22c55e", "#facc15", "#ef4444"]);
    const tooltipEl = tooltipRef.current;

    svg.append("g").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x).tickSize(0)).select(".domain").remove();
    svg.append("g").call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();

    svg.selectAll("rect.cell")
      .data(data).enter().append("rect")
      .attr("class", "cell")
      .attr("x", d => x(d.decade)).attr("y", d => y(d.industry))
      .attr("rx", 2).attr("ry", 2)
      .attr("width", x.bandwidth()).attr("height", y.bandwidth())
      .style("fill", d => color(d.value))
      .on("mouseover", function(event, d) {
        d3.select(this).style("stroke", "#334155").style("stroke-width", 2);
        tooltipEl.style.opacity = "1";
        tooltipEl.innerHTML = `<b>${d.industry}</b><br/>Period: ${d.decade}<br/>Value: <span style="color:${color(d.value)};font-weight:700">${d.value.toFixed(3)}</span>`;
      })
      .on("mousemove", function(event) {
        tooltipEl.style.left = (event.clientX + 14) + "px";
        tooltipEl.style.top = (event.clientY - 44) + "px";
      })
      .on("mouseleave", function() {
        d3.select(this).style("stroke", "none");
        tooltipEl.style.opacity = "0";
      });

    const lg = svg.append("g").attr("transform", `translate(${W + 20},0)`);
    const ly = d3.scaleLinear().domain([0.1, 0.6]).range([H, 0]);
    lg.selectAll("rect").data(d3.range(0.1, 0.61, 0.01)).enter().append("rect")
      .attr("y", d => ly(d)).attr("width", 10).attr("height", H / 50).style("fill", d => color(d));
    lg.append("g").attr("transform", "translate(10,0)").call(d3.axisRight(ly).ticks(5)).select(".domain").remove();
  }, []);

  return (
    <div className="heatmap-wrapper">
      <div ref={containerRef} className="intro-heatmap-viz" />
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
    ["Collaboration", 22], ["Intelligence", 20], ["Soft Skills", 18], ["Upskilling", 17],
    ["Specialization", 16], ["Global", 14], ["Agility", 13], ["Training", 12],
    ["Data Driven", 11], ["Ethics", 10], ["Efficiency", 10], ["Transformation", 9],
    ["Labor Market", 9], ["White-Collar", 8], ["Hiring", 8], ["Career", 7],
  ];
  const palette = ["#2563eb", "#7c3aed", "#0891b2", "#4f46e5", "#0f172a"];

  useEffect(() => {
    if (!canvasRef.current || cloudGenerated.current) return;
    WordCloud(canvasRef.current, {
      list: cloudList,
      gridSize: 6,
      weightFactor: 1.05,
      fontFamily: "'Inter','Impact',sans-serif",
      fontWeight: "700",
      color: (word) => HIGHLIGHTS.has(word) ? "#ef4444" : palette[Math.floor(Math.random() * palette.length)],
      rotateRatio: 0.25,
      backgroundColor: "transparent",
      shape: "circle",
      drawOutOfBound: false,
      shrinkToFit: true,
    });
    cloudGenerated.current = true;
  }, []);

  useEffect(() => {
    const container = scrollParentRef?.current;
    if (!container) return;
    const handle = () => {
      const intro = container.querySelector('[data-section="intro"]');
      if (!intro) return;
      setScrollProgress(Math.min(Math.max(container.scrollTop - intro.offsetTop, 0), 420));
    };
    container.addEventListener("scroll", handle, { passive: true });
    return () => container.removeEventListener("scroll", handle);
  }, [scrollParentRef]);

  const s0Opacity = Math.max(0, 1 - scrollProgress / 60);
  const cloudOpacity = scrollProgress < 60 ? 0 : scrollProgress < 180 ? 1 : Math.max(0, 1 - (scrollProgress - 180) / 40);
  const contentOpacity = scrollProgress < 220 ? 0 : Math.min(1, (scrollProgress - 220) / 70);

  return (
    <div className="intro-container" data-section="intro">
      <div className="intro-sticky-viewport">

        <div className="layer" style={{ opacity: s0Opacity }}>
          <span className="highlight-audience">Dear job seekers,</span>
          <p className="pre-intro-text">AI is reshaping the job market. Are you ready?</p>
        </div>

        <div className="layer stage-cloud" style={{ opacity: cloudOpacity }}>
          <h2 className="cloud-title">Key words when people talked about "Job and AI"</h2>
          <div className="cloud-canvas-wrap">
            <canvas ref={canvasRef} width="900" height="500" className="intro-cloud-canvas" />
          </div>
          <div className="cloud-sources">
            <span className="cloud-src-label">Sources:</span>
            <a className="cloud-src-link" href="https://www.pwc.com/gx/en/issues/artificial-intelligence/job-barometer/2025/methodology-report.pdf" target="_blank" rel="noreferrer">PwC Job Barometer 2025</a>
            <span className="cloud-src-sep">·</span>
            <a className="cloud-src-link" href="https://www.mckinsey.com/~/media/mckinsey/featured%20insights/artificial%20intelligence/notes%20from%20the%20frontier%20modeling%20the%20impact%20of%20ai%20on%20the%20world%20economy/mgi-notes-from-the-ai-frontier-modeling-the-impact-of-ai-on-the-world-economy-september-2018.ashx" target="_blank" rel="noreferrer">McKinsey AI Economy</a>
            <span className="cloud-src-sep">·</span>
            <a className="cloud-src-link" href="https://www.oecd.org/content/dam/oecd/en/publications/reports/2024/04/artificial-intelligence-and-wage-inequality_563908cc/bf98a45c-en.pdf" target="_blank" rel="noreferrer">OECD AI & Wage Inequality</a>
            <span className="cloud-src-sep">·</span>
            <a className="cloud-src-link" href="https://www.jpmorgan.com/insights/global-research/artificial-intelligence/ai-impact-job-growth" target="_blank" rel="noreferrer">JPMorgan AI Job Growth</a>
          </div>
        </div>

        <div className="layer stage-content" style={{ opacity: contentOpacity, pointerEvents: contentOpacity > 0.1 ? 'auto' : 'none' }}>
          <div className="content-grid-v2">
            <div className="content-left-v2">
              <div className="heatmap-box">
                <h3 className="heatmap-title">General view of AI intensity change on job market across industries</h3>
                <AIIntensityHeatmap />
              </div>

              <div className="dataset-card">
                <h4>Dataset 1: Global AI Impact on Jobs (2010–2025)</h4>
                <p>Source: <a href="https://www.kaggle.com/datasets/sarcasmos/ai-society/data" target="_blank" rel="noreferrer">Kaggle – AI &amp; Society</a></p>
                <p className="dataset-desc">We use <strong>6 key columns</strong> from this dataset:</p>
                <div className="column-tags">
                  {['AI Intensity Score','Automation Risk','Job Openings','Salary (USD)','Region','Industry'].map(t => (
                    <span key={t} className={`tag${['AI Intensity Score','Automation Risk'].includes(t) ? ' tag-highlight' : ''}`}>{t}</span>
                  ))}
                </div>
              </div>

              <div className="dataset-card dataset-card-alt">
                <h4>Dataset 2: AI Impact on Job Market (2024-2030)</h4>
                <p>Source: <a href="https://www.kaggle.com/datasets/sahilislam007/ai-impact-on-job-market-20242030/data" target="_blank" rel="noreferrer">Kaggle - AI Impact</a></p>
                <p className="dataset-desc">We focus on <strong>5 columns</strong> for trend comparison:</p>
                <div className="column-tags">
                  {['AI automation risk','Projected job opening','Region','Country','Median salary'].map(t => (
                    <span key={t} className={`tag${['AI automation risk','Projected job opening'].includes(t) ? ' tag-highlight' : ''}`}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="content-right-v2">
              <div className="text-top">
                <h2>The AI Employment Revolution</h2>
                <p>AI is becoming increasingly integrated into the workforce, reshaping job markets and creating new opportunities while also posing challenges for traditional roles.
                  Either you are a job seeker trying to navigate this evolving landscape, or simply curious about how AI is impacting employment trends, this dashboard provides insights into the key factors driving these changes.
                </p>
                <p> We investigate in this 2 dataset and aims to provide an exploratory analysis of the impact of AI and provide a guide for job seekers. </p>
              </div>

              <div className="variable-definitions">
                <div className="def-item">
                  <h4 className="def-title">AI Intensity Score</h4>
                  <p>Measures a sector's reliance on AI technologies(range from 0 to 1). Defined in <a href="https://www.oecd.org/en/publications/a-sectoral-taxonomy-of-ai-intensity_1f6377b5-en.html" target="_blank" rel="noreferrer">OECD Sectoral Taxonomy</a>.</p>
                </div>
                <div className="def-item">
                  <h4 className="def-title">AI Automation Risk</h4>
                  <p>Likelihood of task automation per role(range from 0 to 1). For better understanding, 0.5 is the threshold used in the Methodology sourced from <a href="https://www.pwc.com/gx/en/issues/artificial-intelligence/job-barometer/2025/methodology-report.pdf" target="_blank" rel="noreferrer">PwC Job Barometer 2025</a>.</p>
                </div>
                <div className="def-item">
                  <h4 className="def-title">Job Openings &amp; Salary</h4>
                  <p>Projected positions and compensation trends across AI-exposed sectors.</p>
                </div>
                <div className="def-item">
                  <h4 className="def-title">Region &amp; Industry</h4>
                  <p>Country and continent-level breakdowns across major industries.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Introduction;
