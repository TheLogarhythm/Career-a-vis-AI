import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import "./task1.css";
import { dbUrl } from "../utils/paths";

// ── Mapping: TopoJSON .name → DS1 country name ──────────────────────────
const GEO_TO_DS1 = {
  "United States of America": "United States",
  China: "China",
  "United Kingdom": "United Kingdom",
  Canada: "Canada",
  France: "France",
  Germany: "Germany",
  Japan: "Japan",
  India: "India",
  Brazil: "Brazil",
  Russia: "Russia",
  Italy: "Italy",
  Spain: "Spain",
  Australia: "Australia",
  Mexico: "Mexico",
  "South Korea": "South Korea",
  Indonesia: "Indonesia",
  Turkey: "Turkey",
  Argentina: "Argentina",
  "South Africa": "South Africa",
  Thailand: "Thailand",
  Egypt: "Egypt",
  Nigeria: "Nigeria",
  Colombia: "Colombia",
  Poland: "Poland",
  Chile: "Chile",
  Netherlands: "Netherlands",
  Sweden: "Sweden",
  Singapore: "Singapore",
  Malaysia: "Malaysia",
  Philippines: "Philippines",
  Vietnam: "Vietnam",
  Pakistan: "Pakistan",
  Bangladesh: "Bangladesh",
  "New Zealand": "New Zealand",
  Portugal: "Portugal",
  Peru: "Peru",
  Kenya: "Kenya",
  Ghana: "Ghana",
  Morocco: "Morocco",
  Israel: "Israel",
  Jordan: "Jordan",
  Qatar: "Qatar",
  "Saudi Arabia": "Saudi Arabia",
  "Sri Lanka": "Sri Lanka",
  Nepal: "Nepal",
  Taiwan: "Taiwan",
  UAE: "United Arab Emirates",
};

// ── Mapping: TopoJSON .name → AI Index country name ─────────────────────
const GEO_TO_AI = {
  "United States of America": "United States of America",
  "United Kingdom": "United Kingdom",
  Canada: "Canada",
  France: "France",
  Germany: "Germany",
  Japan: "Japan",
  India: "India",
  Brazil: "Brazil",
  China: "China",
  Italy: "Italy",
  Spain: "Spain",
  Australia: "Australia",
  Mexico: "Mexico",
  "South Korea": "South Korea",
  Indonesia: "Indonesia",
  Turkey: "Turkey",
  Argentina: "Argentina",
  "South Africa": "South Africa",
  Thailand: "Thailand",
  Egypt: "Egypt",
  Nigeria: "Nigeria",
  Colombia: "Colombia",
  Poland: "Poland",
  Chile: "Chile",
  Netherlands: "The Netherlands",
  Sweden: "Sweden",
  Singapore: "Singapore",
  Malaysia: "Malaysia",
  Philippines: "Philippines",
  Vietnam: "Vietnam",
  Pakistan: "Pakistan",
  "New Zealand": "New Zealand",
  Portugal: "Portugal",
  Kenya: "Kenya",
  Morocco: "Morocco",
  Israel: "Israel",
  Qatar: "Qatar",
  "Saudi Arabia": "Saudi Arabia",
  "Sri Lanka": "Sri Lanka",
  Taiwan: "Taiwan",
  "United Arab Emirates": "United Arab Emirates",
  Denmark: "Denmark",
  Finland: "Finland",
  Norway: "Norway",
  Switzerland: "Switzerland",
  Belgium: "Belgium",
  Austria: "Austria",
  Ireland: "Ireland",
  Estonia: "Estonia",
  Iceland: "Iceland",
  Luxembourg: "Luxembourg",
  Czechia: "Czech Republic",
  Hungary: "Hungary",
  Greece: "Greece",
  Russia: "Russia",
  "Hong Kong": "Hong Kong",
  Slovakia: "Slovakia",
  Slovenia: "Slovenia",
  Uruguay: "Uruguay",
  Tunisia: "Tunisia",
  Lithuania: "Lithuania",
  Malta: "Malta",
  Armenia: "Armenia",
  Bahrain: "Bahrain",
};

// ── Color palettes ───────────────────────────────────────────────────────
const DS1_PALETTE = ["#f4ffdb", "#c0d6a4", "#8bae71", "#548943", "#0a6417"];
const AI_PALETTE = ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"];
const FUTURE_PALETTE = ["#fff1d6", "#f4c88a", "#e59b52", "#c86f2a", "#9c4a14"];

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

  const [stageIndex, setStageIndex] = useState(0);
  const [geoData, setGeoData] = useState(null);
  const [ds1Map, setDs1Map] = useState(null); // country → {avgSalary}
  const [ds3Map, setDs3Map] = useState(null); // country → {metrics}
  const [ds3Metric, setDs3Metric] = useState("Total score");

  const DS_STAGE_SCROLL_FACTOR = 1.2; // 120vh per stage
  const DS_STAGE_COUNT = 3; // ds1, ds3, future
  const task1ContainerHeight = `calc(100vh + ${DS_STAGE_COUNT * 120}vh)`;

  // ── Load data ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      d3.json(dbUrl("world-110m.json")),
      d3.csv(dbUrl("ai_impact_jobs_2010_2025.csv")),
      d3.csv(dbUrl("AI_index_db.csv")),
    ]).then(([world, csv1, csv3]) => {
      const features = topojson.feature(world, world.objects.countries).features;
      setGeoData(features);

      // DS1: country-level average salary
      const m1 = new Map();
      csv1.forEach((r) => {
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

      // DS3: AI Index, one row per country
      const ds3 = new Map();
      csv3.forEach((r) => {
        ds3.set(r.Country, {
          "Total score": +r["Total score"] || 0,
          Talent: +r.Talent || 0,
          Research: +r.Research || 0,
          Development: +r.Development || 0,
          Infrastructure: +r.Infrastructure || 0,
          "Government Strategy": +r["Government Strategy"] || 0,
          Commercial: +r.Commercial || 0,
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

      const viewportH = container.clientHeight || window.innerHeight;
      const stageSpan = viewportH * DS_STAGE_SCROLL_FACTOR;
      const maxScroll = stageSpan * DS_STAGE_COUNT;
      const rawScroll = container.scrollTop - section.offsetTop;
      const relScroll = Math.max(0, Math.min(maxScroll, rawScroll));
      const nextStage = Math.min(DS_STAGE_COUNT - 1, Math.floor(relScroll / stageSpan));

      setStageIndex(nextStage);
      if (onStageChange) {
        onStageChange(nextStage);
      }
    };

    container.addEventListener("scroll", handle, { passive: true });
    handle();
    return () => container.removeEventListener("scroll", handle);
  }, [scrollParentRef, onStageChange]);

  // ── Render map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!geoData || !ds1Map || !ds3Map || !svgRef.current) return;

    const W = 1000,
      H = 500;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const projection = d3
      .geoNaturalEarth1()
      .scale(175)
      .translate([W / 2, H / 2]);
    const pathGen = d3.geoPath().projection(projection);
    const g = svg.append("g");
    const tip = d3.select(tooltipRef.current);

    const frame = stageIndex === 0 ? "ds1" : stageIndex === 1 ? "ds3" : "future";

    const ds1Vals = [...ds1Map.values()].map((d) => d.avgSalary).filter((v) => v > 0);
    const ds3Vals = [...ds3Map.values()].map((d) => d[ds3Metric]).filter((v) => v > 0);
    const futureVals = [] as number[];
    geoData.forEach((feature) => {
      const geoName = feature.properties.name;
      const ds1Name = GEO_TO_DS1[geoName];
      const aiName = GEO_TO_AI[geoName];
      if (!ds1Name || !aiName) return;
      const d1 = ds1Map.get(ds1Name);
      const d3 = ds3Map.get(aiName);
      if (!d1 || !d3) return;
      const totalScore = d3["Total score"] || 0;
      const specSalary = d1.avgSalary * 1.03 * (1 - (totalScore / 100) * 0.5);
      if (specSalary > 0) futureVals.push(specSalary);
    });

    const ds1Scale = d3.scaleSequential().domain(d3.extent(ds1Vals)).interpolator(d3.interpolateRgbBasis(DS1_PALETTE));
    const ds3Scale = d3.scaleSequential().domain(d3.extent(ds3Vals)).interpolator(d3.interpolateRgbBasis(AI_PALETTE));
    const futureScale = d3
      .scaleSequential()
      .domain(d3.extent(futureVals))
      .interpolator(d3.interpolateRgbBasis(FUTURE_PALETTE));

    const getColor = (geoName) => {
      if (frame === "ds1") {
        const cName = GEO_TO_DS1[geoName];
        if (!cName) return "#dde3ea";
        const d = ds1Map.get(cName);
        if (!d) return "#dde3ea";
        return ds1Scale(d.avgSalary);
      }

      if (frame === "ds3") {
        const aiName = GEO_TO_AI[geoName];
        if (!aiName) return "#dde3ea";
        const d = ds3Map.get(aiName);
        if (!d) return "#dde3ea";
        return ds3Scale(d[ds3Metric]);
      }

      const ds1Name = GEO_TO_DS1[geoName];
      const aiName = GEO_TO_AI[geoName];
      if (!ds1Name || !aiName) return "#dde3ea";
      const d1 = ds1Map.get(ds1Name);
      const d3 = ds3Map.get(aiName);
      if (!d1 || !d3) return "#dde3ea";
      const totalScore = d3["Total score"] || 0;
      const specSalary = d1.avgSalary * 1.03 * (1 - (totalScore / 100) * 0.5);
      return futureScale(specSalary);
    };

    const buildTip = (geoName) => {
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

      if (frame === "ds3") {
        const aiName = GEO_TO_AI[geoName];
        if (!aiName) return `<div class="tp-title">${geoName}</div><div class="tp-note">No AI Index data</div>`;
        const d = ds3Map.get(aiName);
        if (!d) return `<div class="tp-title">${geoName}</div><div class="tp-note">No data</div>`;
        const mDef = DS3_METRICS.find((m) => m.key === ds3Metric);
        return `
          <div class="tp-title">${geoName}</div>
          <div class="tp-subtitle">AI Index &middot; ${mDef?.label || ds3Metric}</div>
          <div class="tp-divider"></div>
          <div class="tp-row"><span class="tp-label">${mDef?.label || ds3Metric}</span><span class="tp-val">${d[ds3Metric].toFixed(1)}</span></div>
          <div class="tp-row"><span class="tp-label">Total Score</span><span class="tp-val">${d["Total score"].toFixed(1)}</span></div>
        `;
      }

      const ds1Name = GEO_TO_DS1[geoName];
      const aiName = GEO_TO_AI[geoName];
      if (!ds1Name || !aiName) return `<div class="tp-title">${geoName}</div><div class="tp-note">No data</div>`;
      const d1 = ds1Map.get(ds1Name);
      const d3 = ds3Map.get(aiName);
      if (!d1 || !d3) return `<div class="tp-title">${geoName}</div><div class="tp-note">No data</div>`;
      const totalScore = d3["Total score"] || 0;
      const lossRate = (totalScore / 100) * 0.5;
      const specSalary = d1.avgSalary * 1.03 * (1 - lossRate);
      return `
        <div class="tp-title">${geoName}</div>
        <div class="tp-subtitle">Speculative Salary &middot; DS1 * 1.03 * (1 - Total Score * 0.5)</div>
        <div class="tp-divider"></div>
        <div class="tp-row"><span class="tp-label">DS1 Avg Salary</span><span class="tp-val">$${Math.round(d1.avgSalary).toLocaleString()}</span></div>
        <div class="tp-row"><span class="tp-label">Total Score</span><span class="tp-val">${totalScore.toFixed(1)}</span></div>
        <div class="tp-row"><span class="tp-label">Loss Rate</span><span class="tp-val">${(lossRate * 100).toFixed(1)}%</span></div>
        <div class="tp-row"><span class="tp-label">Spec Salary</span><span class="tp-val">$${Math.round(specSalary).toLocaleString()}</span></div>
      `;
    };

    g.selectAll("path")
      .data(geoData)
      .enter()
      .append("path")
      .attr("class", "country-path")
      .attr("d", pathGen)
      .attr("fill", (d) => getColor(d.properties.name))
      .on("mouseover", function (event, d) {
        d3.select(this).raise().style("stroke", "#1e293b").style("stroke-width", "1.5");
        tip.style("opacity", 1).html(buildTip(d.properties.name));
      })
      .on("mousemove", (event) => {
        tip.style("left", `${event.clientX + 20}px`).style("top", `${event.clientY - 18}px`);
      })
      .on("mouseleave", function () {
        d3.select(this).style("stroke", "#ffffff").style("stroke-width", "0.4");
        tip.style("opacity", 0);
      });

    // ── Update legend ──
    const binsWrap = fixedRef.current?.querySelector(".legend-bins-wrap");
    const legendTitle = fixedRef.current?.querySelector(".legend-title");

    if (binsWrap && legendTitle) {
      if (frame === "ds1") {
        legendTitle.textContent = "Avg Salary (USD) - 2010-2025";
        const [lo, hi] = d3.extent(ds1Vals);
        const N = DS1_PALETTE.length;
        let previousHi: number | null = null;
        binsWrap.innerHTML = Array.from({ length: N }, (_, i) => {
          const loV = lo + ((hi - lo) * i) / N;
          const hiV = lo + ((hi - lo) * (i + 1)) / N;
          const color = ds1Scale((loV + hiV) / 2);
          const displayLo = i === 0 ? Math.round(loV / 1000) : Math.max((previousHi ?? 0) + 1, Math.round(loV / 1000));
          const displayHi = Math.max(displayLo, Math.round(hiV / 1000));
          previousHi = displayHi;
          return `<div class="legend-bin"><span class="legend-swatch" style="background:${color}"></span><span>$${displayLo}k &ndash; $${displayHi}k</span></div>`;
        }).join("");
      } else if (frame === "ds3") {
        const mDef = DS3_METRICS.find((m) => m.key === ds3Metric);
        legendTitle.textContent = `${mDef?.label || ds3Metric} - AI Index`;
        const [lo, hi] = d3.extent(ds3Vals);
        const N = AI_PALETTE.length;
        let previousHi: number | null = null;
        binsWrap.innerHTML = Array.from({ length: N }, (_, i) => {
          const loV = lo + ((hi - lo) * i) / N;
          const hiV = lo + ((hi - lo) * (i + 1)) / N;
          const color = ds3Scale((loV + hiV) / 2);
          const displayLo = i === 0 ? +loV.toFixed(1) : Math.max((previousHi ?? 0) + 0.1, +loV.toFixed(1));
          const displayHi = Math.max(displayLo, +hiV.toFixed(1));
          previousHi = displayHi;
          return `<div class="legend-bin"><span class="legend-swatch" style="background:${color}"></span><span>${displayLo.toFixed(1)} &ndash; ${displayHi.toFixed(1)}</span></div>`;
        }).join("");
      } else {
        legendTitle.textContent = "Speculative Salary";
        const [lo, hi] = d3.extent(futureVals);
        const N = FUTURE_PALETTE.length;
        let previousHi: number | null = null;
        binsWrap.innerHTML = Array.from({ length: N }, (_, i) => {
          const loV = lo + ((hi - lo) * i) / N;
          const hiV = lo + ((hi - lo) * (i + 1)) / N;
          const color = futureScale((loV + hiV) / 2);
          const displayLo = i === 0 ? Math.round(loV / 1000) : Math.max((previousHi ?? 0) + 1, Math.round(loV / 1000));
          const displayHi = Math.max(displayLo, Math.round(hiV / 1000));
          previousHi = displayHi;
          return `<div class="legend-bin"><span class="legend-swatch" style="background:${color}"></span><span>$${displayLo}k &ndash; $${displayHi}k</span></div>`;
        }).join("");
      }
    }
  }, [geoData, ds1Map, ds3Map, ds3Metric, stageIndex]);

  const frame = stageIndex === 0 ? "ds1" : stageIndex === 1 ? "ds3" : "future";

  const leaderboardEntries = (() => {
    if (!geoData || !ds1Map || !ds3Map) return [];

    const items: Array<{ name: string; value: number }> = [];

    geoData.forEach((feature) => {
      const geoName = feature.properties.name;
      const ds1Name = GEO_TO_DS1[geoName];
      const aiName = GEO_TO_AI[geoName];
      if (!ds1Name || !aiName) return;

      const d1 = ds1Map.get(ds1Name);
      const d3 = ds3Map.get(aiName);
      if (!d1 || !d3) return;

      const totalScore = d3["Total score"] || 0;
      const speculativeSalary = d1.avgSalary * 1.03 * (1 - (totalScore / 100) * 0.5);

      const value = frame === "ds1" ? d1.avgSalary : frame === "ds3" ? d3[ds3Metric] || 0 : speculativeSalary;

      if (value > 0) {
        items.push({ name: geoName, value });
      }
    });

    return items.sort((a, b) => b.value - a.value).slice(0, 10);
  })();

  const leaderboardMax = Math.max(1, ...leaderboardEntries.map((item) => item.value));
  const leaderboardTitle =
    frame === "ds1"
      ? "Top 10 countries by avg salary"
      : frame === "ds3"
        ? `Top 10 countries by ${DS3_METRICS.find((metric) => metric.key === ds3Metric)?.label || ds3Metric}`
        : "Top 10 countries by speculative salary";
  const leaderboardSubtitle =
    frame === "ds1"
      ? "Ranked by DS1 average salary"
      : frame === "ds3"
        ? "Ranked by the selected AI Index metric"
        : "Ranked by the speculative salary formula";
  const leaderboardAccent = frame === "ds1" ? "#548943" : frame === "ds3" ? "#2171b5" : "#c86f2a";

  // ── Info panel descriptions ────────────────────────────────────────────
  const DS1_DESC = (
    <>
      Average AI-related salaries across <strong className="hl">44 countries</strong>, 2010&ndash;2025. Helps identify
      which markets offer <strong className="hl">competitive pay</strong> for career targeting.
    </>
  );

  const FUTURE_DESC = (
    <>
      Speculative salary map based on Average Salary and the AI Index Total Score. Formula:{" "}
      <strong className="hl">
        Avg Salary * (1 + Inflation (3%)) * (1 - AI Score * Probability of Replacement (50%))
      </strong>
      .
    </>
  );

  const DS3_DESCS = {
    "Total score": (
      <>
        Benchmarks nations on <strong className="hl">investment</strong>, <strong className="hl">innovation</strong> and{" "}
        <strong className="hl">implementation</strong> of AI. Higher scores = more AI roles and career growth.
      </>
    ),
    Talent: (
      <>
        <strong className="hl">Implementation</strong> indicator. Measures availability of{" "}
        <strong className="hl">skilled AI practitioners</strong>. High scores mean more opportunities but stiffer
        competition.
      </>
    ),
    Infrastructure: (
      <>
        <strong className="hl">Implementation</strong> indicator. Measures{" "}
        <strong className="hl">reliability of access infrastructure</strong> &mdash; internet, electricity,
        supercomputing.
      </>
    ),
    Research: (
      <>
        <strong className="hl">Innovation</strong> indicator. Measures{" "}
        <strong className="hl">publications and citations</strong> in academic journals.
      </>
    ),
    Development: (
      <>
        <strong className="hl">Innovation</strong> indicator. Measures development of{" "}
        <strong className="hl">fundamental platforms and algorithms</strong>.
      </>
    ),
    "Government Strategy": (
      <>
        <strong className="hl">Investment</strong> indicator. Measures{" "}
        <strong className="hl">government spending</strong> and <strong className="hl">national AI strategies</strong>.
      </>
    ),
    Commercial: (
      <>
        <strong className="hl">Investment</strong> indicator. Measures <strong className="hl">startup activity</strong>{" "}
        and <strong className="hl">business investment</strong> in AI.
      </>
    ),
  };

  const badgeMainText =
    frame === "ds1" ? "Average Salary (2010-2025)" : frame === "ds3" ? "Global AI Index" : "Speculative Salary";
  const badgeSubContent =
    frame === "ds1" ? (
      "Avg salary for jobs in country"
    ) : frame === "ds3" ? (
      <>
        How AI were adopted in each field, normalized with top country = 100.
        <br />
        {DS3_DESCS[ds3Metric as keyof typeof DS3_DESCS] || DS3_DESCS["Total score"]}
      </>
    ) : (
      "Calculated based on Avg Salary and AI Index Total Score"
    );

  const showMetricToggle = frame === "ds3";

  return (
    <div className="task1-scroll-container" style={{ height: task1ContainerHeight }}>
      <div className="task1-fixed-viewport" ref={fixedRef}>
        <div className="dataset-badge">
          <div className="badge-main">{badgeMainText}</div>
          <div className="badge-sub">{badgeSubContent}</div>
        </div>

        <div className="task1-stage-layout">
          <div className="task1-map-shell">
            <svg ref={svgRef} viewBox="0 0 1000 500" className="task1-map-svg" />
            <div ref={tooltipRef} className="task1-tooltip" />
          </div>

          <aside className="task1-sidebar">
            <section className="leaderboard-card">
              <div className="leaderboard-chart">
                {leaderboardEntries.length ? (
                  leaderboardEntries.map((item, index) => {
                    const width = (item.value / leaderboardMax) * 100;
                    const displayValue =
                      frame === "ds3" ? item.value.toFixed(1) : `$${Math.round(item.value).toLocaleString()}`;

                    return (
                      <div key={`${item.name}-${index}`} className="leaderboard-row">
                        <div className="leaderboard-row-top">
                          <div className="leaderboard-rank">{index + 1}</div>
                          <div className="leaderboard-country">{item.name}</div>
                          <div className="leaderboard-value">{displayValue}</div>
                        </div>
                        <div className="leaderboard-bar-track">
                          <div
                            className="leaderboard-bar-fill"
                            style={{ width: `${width}%`, backgroundColor: leaderboardAccent }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="leaderboard-empty">Waiting for data...</div>
                )}
              </div>
            </section>

            <div className="legend-container">
              <div className="legend-title"></div>
              <div className="legend-bins-wrap" />
            </div>
          </aside>
        </div>

        <div className="stage-dots">
          {[
            ["ds1", "Avg Salary"],
            ["ds3", "Global AI Index"],
            ["future", "Speculative Salary"],
          ].map(([key, label]) => (
            <div key={key} className={`stage-dot-wrap ${frame === key ? "active" : ""}`}>
              <div className="stage-dot" />
              <span className="stage-dot-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Metric toggle — only for DS3 */}
        <div
          className="metric-toggle"
          style={{ opacity: showMetricToggle ? 1 : 0, pointerEvents: showMetricToggle ? "auto" : "none" }}
        >
          {DS3_METRICS.map((m) => (
            <button key={m.key} className={ds3Metric === m.key ? "active" : ""} onClick={() => setDs3Metric(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Task1;
