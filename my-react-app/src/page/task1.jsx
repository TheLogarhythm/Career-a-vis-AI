import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import "./task1.css";

const baseUrl = import.meta.env.BASE_URL || "/";

// ── Mapping: TopoJSON .name → DS1 country name ──────────────────────────
const GEO_TO_DS1 = {
  "United States of America": "United States",
  "China": "China",
  "United Kingdom": "United Kingdom",
  "Canada": "Canada",
  "France": "France",
  "Germany": "Germany",
  "Japan": "Japan",
  "India": "India",
  "Brazil": "Brazil",
  "Russia": "Russia",
  "Italy": "Italy",
  "Spain": "Spain",
  "Australia": "Australia",
  "Mexico": "Mexico",
  "South Korea": "South Korea",
  "Indonesia": "Indonesia",
  "Turkey": "Turkey",
  "Argentina": "Argentina",
  "South Africa": "South Africa",
  "Thailand": "Thailand",
  "Egypt": "Egypt",
  "Nigeria": "Nigeria",
  "Colombia": "Colombia",
  "Poland": "Poland",
  "Chile": "Chile",
  "Netherlands": "Netherlands",
  "Sweden": "Sweden",
  "Singapore": "Singapore",
  "Malaysia": "Malaysia",
  "Philippines": "Philippines",
  "Vietnam": "Vietnam",
  "Pakistan": "Pakistan",
  "Bangladesh": "Bangladesh",
  "New Zealand": "New Zealand",
  "Portugal": "Portugal",
  "Peru": "Peru",
  "Kenya": "Kenya",
  "Ghana": "Ghana",
  "Morocco": "Morocco",
  "Israel": "Israel",
  "Jordan": "Jordan",
  "Qatar": "Qatar",
  "Saudi Arabia": "Saudi Arabia",
  "Sri Lanka": "Sri Lanka",
  "Nepal": "Nepal",
  "Taiwan": "Taiwan",
  "UAE": "United Arab Emirates",
};

// ── Mapping: TopoJSON .name → DS2 Location name ──────────────────────────
const GEO_TO_DS2 = {
  "United States of America": "USA",
  "United Kingdom": "UK",
  "Canada": "Canada",
  "Australia": "Australia",
  "Germany": "Germany",
  "China": "China",
  "India": "India",
  "Brazil": "Brazil",
};

// ── Mapping: TopoJSON .name → AI Index country name ─────────────────────
const GEO_TO_AI = {
  "United States of America": "United States of America",
  "United Kingdom": "United Kingdom",
  "Canada": "Canada",
  "France": "France",
  "Germany": "Germany",
  "Japan": "Japan",
  "India": "India",
  "Brazil": "Brazil",
  "China": "China",
  "Italy": "Italy",
  "Spain": "Spain",
  "Australia": "Australia",
  "Mexico": "Mexico",
  "South Korea": "South Korea",
  "Indonesia": "Indonesia",
  "Turkey": "Turkey",
  "Argentina": "Argentina",
  "South Africa": "South Africa",
  "Thailand": "Thailand",
  "Egypt": "Egypt",
  "Nigeria": "Nigeria",
  "Colombia": "Colombia",
  "Poland": "Poland",
  "Chile": "Chile",
  "Netherlands": "The Netherlands",
  "Sweden": "Sweden",
  "Singapore": "Singapore",
  "Malaysia": "Malaysia",
  "Philippines": "Philippines",
  "Vietnam": "Vietnam",
  "Pakistan": "Pakistan",
  "New Zealand": "New Zealand",
  "Portugal": "Portugal",
  "Kenya": "Kenya",
  "Morocco": "Morocco",
  "Israel": "Israel",
  "Qatar": "Qatar",
  "Saudi Arabia": "Saudi Arabia",
  "Sri Lanka": "Sri Lanka",
  "Taiwan": "Taiwan",
  "United Arab Emirates": "United Arab Emirates",
  "Denmark": "Denmark",
  "Finland": "Finland",
  "Norway": "Norway",
  "Switzerland": "Switzerland",
  "Belgium": "Belgium",
  "Austria": "Austria",
  "Ireland": "Ireland",
  "Estonia": "Estonia",
  "Iceland": "Iceland",
  "Luxembourg": "Luxembourg",
  "Czechia": "Czech Republic",
  "Hungary": "Hungary",
  "Greece": "Greece",
  "Russia": "Russia",
  "Hong Kong": "Hong Kong",
  "Slovakia": "Slovakia",
  "Slovenia": "Slovenia",
  "Uruguay": "Uruguay",
  "Tunisia": "Tunisia",
  "Lithuania": "Lithuania",
  "Malta": "Malta",
  "Armenia": "Armenia",
  "Bahrain": "Bahrain",
};

// ── Color palettes ───────────────────────────────────────────────────────
const DS1_PALETTE = ["#f4ffdb", "#c0d6a4", "#8bae71", "#548943", "#0a6417"];
const DS2_PALETTE = ["#91ff42", "#6cd739", "#4aaf2f", "#2b8923", "#0a6417"];
const AI_PALETTE  = ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"];

// ── DS3 metric definitions ──────────────────────────────────────────────
const DS3_METRICS = [
  { key: "Total score", label: "Total Score" },
  { key: "Talent", label: "Talent" },
  { key: "Research", label: "Research" },
  { key: "Development", label: "Development" },
  { key: "Infrastructure", label: "Infrastructure" },
  { key: "Government Strategy", label: "Gov Strategy" },
  { key: "Commercial", label: "Commercial" },
];

function Task1({ scrollParentRef, onStageChange }) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const fixedRef = useRef(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [geoData, setGeoData] = useState(null);
  const [ds1Map, setDs1Map] = useState(null);   // country → {avgSalary}
  const [ds2Map, setDs2Map] = useState(null);   // country → {avgSalary}
  const [ds3Map, setDs3Map] = useState(null);   // country → {all metrics}
  const [ds3Metric, setDs3Metric] = useState("Total score");

  // ── Load data ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      d3.json(`${baseUrl}world-110m.json`),
      d3.csv(`${baseUrl}ai_impact_jobs_2010_2025.csv`),
      d3.csv(`${baseUrl}ai_job_trends_dataset.csv`),
      d3.csv(`${baseUrl}AI_index_db.csv`),
    ]).then(([world, csv1, csv2, csv3]) => {
      const features = topojson.feature(world, world.objects.countries).features;
      setGeoData(features);

      // ── DS1: aggregate by country (avg salary) ──
      const m1 = new Map();
      csv1.forEach(r => {
        const c = r.country;
        if (!c) return;
        if (!m1.has(c)) m1.set(c, { sum: 0, count: 0 });
        const d = m1.get(c);
        d.sum += +r.salary_usd || 0;
        d.count++;
      });
      const ds1 = new Map();
      for (const [c, d] of m1) {
        ds1.set(c, { avgSalary: d.sum / d.count });
      }
      setDs1Map(ds1);

      // ── DS2: aggregate by Location (avg salary) ──
      const m2 = new Map();
      csv2.forEach(r => {
        const loc = r.Location;
        if (!loc) return;
        if (!m2.has(loc)) m2.set(loc, { sum: 0, count: 0 });
        const d = m2.get(loc);
        d.sum += +r["Median Salary (USD)"] || 0;
        d.count++;
      });
      const ds2 = new Map();
      for (const [c, d] of m2) {
        ds2.set(c, { avgSalary: d.sum / d.count });
      }
      setDs2Map(ds2);

      // ── DS3: AI Index, one row per country ──
      const ds3 = new Map();
      csv3.forEach(r => {
        ds3.set(r.Country, {
          "Total score": +r["Total score"] || 0,
          "Talent": +r.Talent || 0,
          "Research": +r.Research || 0,
          "Development": +r.Development || 0,
          "Infrastructure": +r.Infrastructure || 0,
          "Government Strategy": +r["Government Strategy"] || 0,
          "Commercial": +r.Commercial || 0,
        });
      });
      setDs3Map(ds3);
    });
  }, []);

  // ── Scroll listener ────────────────────────────────────────────────────
  useEffect(() => {
    const container = scrollParentRef?.current;
    if (!container) return;
    const handle = () => {
      const section = container.querySelector('[data-task="section1"]');
      if (!section) return;
      const relScroll = Math.max(0, container.scrollTop - section.offsetTop);
      const total = Math.max(1, section.offsetHeight - container.clientHeight);
      const p = Math.min(1, relScroll / total);
      setScrollProgress(p);
      if (onStageChange) {
        onStageChange(
          p < 0.15 ? 0 : p < 0.45 ? 1 : p < 0.72 ? 2 : 3
        );
      }
    };
    container.addEventListener("scroll", handle, { passive: true });
    handle();
    return () => container.removeEventListener("scroll", handle);
  }, [scrollParentRef, onStageChange]);

  // ── Render map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!geoData || !ds1Map || !ds2Map || !ds3Map || !svgRef.current) return;

    const W = 1000, H = 500;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const projection = d3.geoNaturalEarth1().scale(175).translate([W / 2, H / 2]);
    const pathGen = d3.geoPath().projection(projection);
    const g = svg.append("g");
    const tip = d3.select(tooltipRef.current);

    const frame = scrollProgress < 0.15
      ? "base"
      : scrollProgress < 0.45
        ? "ds1"
        : scrollProgress < 0.72
          ? "ds2"
          : "ds3";

    // ── Build separate color scales ──
    const ds1Vals = [...ds1Map.values()].map(d => d.avgSalary).filter(v => v > 0);
    const ds2Vals = [...ds2Map.values()].map(d => d.avgSalary).filter(v => v > 0);
    const ds3Vals = [...ds3Map.values()].map(d => d[ds3Metric]).filter(v => v > 0);

    const ds1Scale = d3.scaleSequential().domain(d3.extent(ds1Vals)).interpolator(d3.interpolateRgbBasis(DS1_PALETTE));
    const ds2Scale = d3.scaleSequential().domain(d3.extent(ds2Vals)).interpolator(d3.interpolateRgbBasis(DS2_PALETTE));
    const ds3Scale = d3.scaleSequential().domain(d3.extent(ds3Vals)).interpolator(d3.interpolateRgbBasis(AI_PALETTE));

    const getColor = (geoName) => {
      if (frame === "base") return "#e8edf2";

      if (frame === "ds1") {
        const cName = GEO_TO_DS1[geoName];
        if (!cName) return "#dde3ea";
        const d = ds1Map.get(cName);
        if (!d) return "#dde3ea";
        return ds1Scale(d.avgSalary);
      }

      if (frame === "ds2") {
        const loc = GEO_TO_DS2[geoName];
        if (!loc) return "#dde3ea";
        const d = ds2Map.get(loc);
        if (!d) return "#dde3ea";
        return ds2Scale(d.avgSalary);
      }

      // ds3
      const aiName = GEO_TO_AI[geoName];
      if (!aiName) return "#dde3ea";
      const d = ds3Map.get(aiName);
      if (!d) return "#dde3ea";
      return ds3Scale(d[ds3Metric]);
    };

    // ── Build tooltip HTML ──
    const buildTip = (geoName) => {
      if (frame === "base") {
        return `<div class="tp-title">${geoName}</div><div class="tp-note">Scroll down to reveal data</div>`;
      }

      if (frame === "ds1") {
        const cName = GEO_TO_DS1[geoName];
        if (!cName) return `<div class="tp-title">${geoName}</div><div class="tp-note">No data</div>`;
        const d = ds1Map.get(cName);
        if (!d) return `<div class="tp-title">${geoName}</div><div class="tp-note">No data</div>`;
        return `
          <div class="tp-title">${geoName}</div>
          <div class="tp-subtitle">2010 &ndash; 2025 &middot; ${cName}</div>
          <div class="tp-divider"></div>
          <div class="tp-row"><span class="tp-label">Avg Salary</span><span class="tp-val">$${Math.round(d.avgSalary).toLocaleString()}</span></div>
        `;
      }

      if (frame === "ds2") {
        const loc = GEO_TO_DS2[geoName];
        if (!loc) return `<div class="tp-title">${geoName}</div><div class="tp-note">No data (only major economies covered)</div>`;
        const d = ds2Map.get(loc);
        if (!d) return `<div class="tp-title">${geoName}</div><div class="tp-note">No data</div>`;
        return `
          <div class="tp-title">${geoName}</div>
          <div class="tp-subtitle">2024 &ndash; 2030 &middot; ${loc}</div>
          <div class="tp-divider"></div>
          <div class="tp-row"><span class="tp-label">Median Salary</span><span class="tp-val">$${Math.round(d.avgSalary).toLocaleString()}</span></div>
        `;
      }

      // ds3
      const aiName = GEO_TO_AI[geoName];
      if (!aiName) return `<div class="tp-title">${geoName}</div><div class="tp-note">No AI Index data</div>`;
      const d = ds3Map.get(aiName);
      if (!d) return `<div class="tp-title">${geoName}</div><div class="tp-note">No data</div>`;
      const mDef = DS3_METRICS.find(m => m.key === ds3Metric);
      return `
        <div class="tp-title">${geoName}</div>
        <div class="tp-subtitle">AI Index &middot; ${mDef?.label || ds3Metric}</div>
        <div class="tp-divider"></div>
        <div class="tp-row"><span class="tp-label">${mDef?.label || ds3Metric}</span><span class="tp-val">${d[ds3Metric].toFixed(1)}</span></div>
        <div class="tp-row"><span class="tp-label">Total Score</span><span class="tp-val">${d["Total score"].toFixed(1)}</span></div>
      `;
    };

    // ── Draw paths ──
    g.selectAll("path")
      .data(geoData)
      .enter()
      .append("path")
      .attr("class", "country-path")
      .attr("d", pathGen)
      .attr("fill", d => getColor(d.properties.name))
      .on("mouseover", function(event, d) {
        d3.select(this).raise()
          .style("stroke", "#1e293b")
          .style("stroke-width", "1.5");
        tip.style("opacity", 1).html(buildTip(d.properties.name));
      })
      .on("mousemove", (event) => {
        tip.style("left", `${event.clientX + 20}px`).style("top", `${event.clientY - 18}px`);
      })
      .on("mouseleave", function() {
        d3.select(this).style("stroke", "#ffffff").style("stroke-width", "0.4");
        tip.style("opacity", 0);
      });

    // ── Update legend ──
    const binsWrap = fixedRef.current?.querySelector(".legend-bins-wrap");
    const legendTitle = fixedRef.current?.querySelector(".legend-title");

    if (binsWrap && legendTitle) {
      if (frame === "base") {
        legendTitle.textContent = "";
        binsWrap.innerHTML = "";
      } else if (frame === "ds1") {
        legendTitle.textContent = "Avg Salary (USD) \u2014 2010-2025";
        const [lo, hi] = d3.extent(ds1Vals);
        const N = DS1_PALETTE.length;
        binsWrap.innerHTML = Array.from({ length: N }, (_, i) => {
          const loV = lo + (hi - lo) * i / N;
          const hiV = lo + (hi - lo) * (i + 1) / N;
          const color = ds1Scale((loV + hiV) / 2);
          return `<div class="legend-bin"><span class="legend-swatch" style="background:${color}"></span><span>$${Math.round(loV / 1000)}k &ndash; $${Math.round(hiV / 1000)}k</span></div>`;
        }).join("");
      } else if (frame === "ds2") {
        legendTitle.textContent = "Median Salary (USD) \u2014 2024-2030";
        const [lo, hi] = d3.extent(ds2Vals);
        const N = DS2_PALETTE.length;
        binsWrap.innerHTML = Array.from({ length: N }, (_, i) => {
          const loV = lo + (hi - lo) * i / N;
          const hiV = lo + (hi - lo) * (i + 1) / N;
          const color = ds2Scale((loV + hiV) / 2);
          return `<div class="legend-bin"><span class="legend-swatch" style="background:${color}"></span><span>$${Math.round(loV / 1000)}k &ndash; $${Math.round(hiV / 1000)}k</span></div>`;
        }).join("");
      } else {
        const mDef = DS3_METRICS.find(m => m.key === ds3Metric);
        legendTitle.textContent = `${mDef?.label || ds3Metric} \u2014 AI Index`;
        const [lo, hi] = d3.extent(ds3Vals);
        const N = AI_PALETTE.length;
        binsWrap.innerHTML = Array.from({ length: N }, (_, i) => {
          const loV = lo + (hi - lo) * i / N;
          const hiV = lo + (hi - lo) * (i + 1) / N;
          const color = ds3Scale((loV + hiV) / 2);
          return `<div class="legend-bin"><span class="legend-swatch" style="background:${color}"></span><span>${loV.toFixed(1)} &ndash; ${hiV.toFixed(1)}</span></div>`;
        }).join("");
      }
    }

    // ── Update badge ──
    const badgeMain = fixedRef.current?.querySelector(".badge-main");
    const badgeSub = fixedRef.current?.querySelector(".badge-sub");
    if (badgeMain) {
      badgeMain.textContent =
        frame === "base"
          ? "Scroll to reveal AI impact data"
          : frame === "ds1"
            ? "Dataset 1: Global AI Impact (2010\u20132025)"
            : frame === "ds2"
              ? "Dataset 2: AI Job Trends (2024\u20132030)"
              : "Dataset 3: Global AI Index";
    }
    if (badgeSub) {
      badgeSub.textContent =
        frame === "base"
          ? "Four stages: historical salary \u2192 predicted salary \u2192 AI readiness"
          : frame === "ds1"
            ? "Colored by Country \u00B7 Avg salary per country"
            : frame === "ds2"
              ? "Colored by Country \u00B7 Only major economies covered"
              : "Colored by Country \u00B7 Select metric to explore";
    }
  }, [geoData, ds1Map, ds2Map, ds3Map, ds3Metric, scrollProgress]);

  const frame = scrollProgress < 0.15
    ? "base"
    : scrollProgress < 0.45
      ? "ds1"
      : scrollProgress < 0.72
        ? "ds2"
        : "ds3";

  // ── Info panel descriptions ────────────────────────────────────────────
  const DS1_DESC = (
    <>
      Average AI-related salaries across <strong className="hl">44 countries</strong>, 2010&ndash;2025.
      Helps identify which markets offer <strong className="hl">competitive pay</strong> for career targeting.
    </>
  );

  const DS2_DESC = (
    <>
      Salary forecasts for <strong className="hl">8 major economies</strong>, 2024&ndash;2030.
      Helps <strong className="hl">anticipate future earnings</strong> for strategic career planning.
    </>
  );

  const DS3_DESCS = {
    "Total score": (
      <>
        Benchmarks nations on <strong className="hl">investment</strong>, <strong className="hl">innovation</strong> and <strong className="hl">implementation</strong> of AI.
        Higher scores = more AI roles and career growth.
      </>
    ),
    "Talent": (
      <>
        <strong className="hl">Implementation</strong> indicator. Measures availability of <strong className="hl">skilled AI practitioners</strong>.
        High scores mean more opportunities but stiffer competition.
      </>
    ),
    "Infrastructure": (
      <>
        <strong className="hl">Implementation</strong> indicator. Measures <strong className="hl">reliability of access infrastructure</strong> &mdash; internet, electricity, supercomputing.
        Determines whether you can effectively build and scale AI solutions.
      </>
    ),
    "Research": (
      <>
        <strong className="hl">Innovation</strong> indicator. Measures <strong className="hl">publications and citations</strong> in academic journals.
        High scores signal strong academic-industry pipelines and cutting-edge roles.
      </>
    ),
    "Development": (
      <>
        <strong className="hl">Innovation</strong> indicator. Measures development of <strong className="hl">fundamental platforms and algorithms</strong>.
        High scores = thriving tech ecosystem, ideal for engineers and developers.
      </>
    ),
    "Government Strategy": (
      <>
        <strong className="hl">Investment</strong> indicator. Measures <strong className="hl">government spending</strong> and <strong className="hl">national AI strategies</strong>.
        Often translates into funding, grants, and policy support for AI professionals.
      </>
    ),
    "Commercial": (
      <>
        <strong className="hl">Investment</strong> indicator. Measures <strong className="hl">startup activity</strong> and <strong className="hl">business investment</strong> in AI.
        High scores = vibrant AI market with more job openings and higher salaries.
      </>
    ),
  };

  const showMetricToggle = frame === "ds3";

  return (
    <div className="task1-scroll-container">
      <div className="task1-fixed-viewport" ref={fixedRef}>

        <div className="dataset-badge">
          <div className="badge-main">Scroll to reveal AI impact data</div>
          <div className="badge-sub">Four stages: historical salary &rarr; predicted salary &rarr; AI readiness</div>
        </div>

        {frame !== "base" && (
          <div className="info-panel">
            {frame === "ds1" && DS1_DESC}
            {frame === "ds2" && DS2_DESC}
            {frame === "ds3" && (DS3_DESCS[ds3Metric] || null)}
          </div>
        )}

        <svg ref={svgRef} viewBox="0 0 1000 500" className="task1-map-svg" />
        <div ref={tooltipRef} className="task1-tooltip" />

        <div className="stage-dots">
          {[
            ["base", "Blank Canvas"],
            ["ds1", "DS1: 2010-2025"],
            ["ds2", "DS2: 2024-2030"],
            ["ds3", "DS3: AI Index"],
          ].map(([key, label]) => (
            <div key={key} className={`stage-dot-wrap ${frame === key ? "active" : ""}`}>
              <div className="stage-dot" />
              <span className="stage-dot-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Metric toggle — only for DS3 */}
        <div className="metric-toggle" style={{ opacity: showMetricToggle ? 1 : 0, pointerEvents: showMetricToggle ? "auto" : "none" }}>
          {DS3_METRICS.map(m => (
            <button
              key={m.key}
              className={ds3Metric === m.key ? "active" : ""}
              onClick={() => setDs3Metric(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="legend-container">
          <div className="legend-title"></div>
          <div className="legend-bins-wrap" />
        </div>

      </div>
    </div>
  );
}

export default Task1;
