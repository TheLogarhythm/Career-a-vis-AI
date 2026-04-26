import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import "./task1.css";
import { DollarSign, Bot } from "lucide-react";

const baseUrl = import.meta.env.BASE_URL || "/";

// Mapping: TopoJSON .name -> DS1 region
// (DS1 region values: North America / South America / Europe / East Asia /
//  South Asia / Southeast Asia / Middle East / Africa / Oceania)
const GEO_TO_DS1_REGION = {
  // North America
  "United States of America": "North America",
  "Canada": "North America",
  "Mexico": "North America",
  // South America
  "Brazil": "South America",
  "Colombia": "South America",
  "Peru": "South America",
  "Argentina": "South America",
  "Chile": "South America",
  // Europe  (DS1 uses "Europe" as single region)
  "United Kingdom": "Europe",
  "Germany": "Europe",
  "France": "Europe",
  "Italy": "Europe",
  "Spain": "Europe",
  "Netherlands": "Europe",
  "Sweden": "Europe",
  "Poland": "Europe",
  "Portugal": "Europe",
  "Belgium": "Europe",
  "Switzerland": "Europe",
  "Austria": "Europe",
  "Norway": "Europe",
  "Denmark": "Europe",
  "Finland": "Europe",
  "Greece": "Europe",
  "Czechia": "Europe",
  "Hungary": "Europe",
  "Romania": "Europe",
  "Ukraine": "Europe",
  "Russia": "Europe",
  // East Asia
  "China": "East Asia",
  "Japan": "East Asia",
  "South Korea": "East Asia",
  "Taiwan": "East Asia",
  "North Korea": "East Asia",
  "Mongolia": "East Asia",
  // South Asia
  "India": "South Asia",
  "Pakistan": "South Asia",
  "Bangladesh": "South Asia",
  "Sri Lanka": "South Asia",
  "Nepal": "South Asia",
  "Bhutan": "South Asia",
  // Southeast Asia
  "Indonesia": "Southeast Asia",
  "Vietnam": "Southeast Asia",
  "Singapore": "Southeast Asia",
  "Thailand": "Southeast Asia",
  "Philippines": "Southeast Asia",
  "Malaysia": "Southeast Asia",
  "Myanmar": "Southeast Asia",
  "Cambodia": "Southeast Asia",
  "Laos": "Southeast Asia",
  // Middle East
  "United Arab Emirates": "Middle East",
  "Jordan": "Middle East",
  "Israel": "Middle East",
  "Qatar": "Middle East",
  "Saudi Arabia": "Middle East",
  "Iraq": "Middle East",
  "Iran": "Middle East",
  "Turkey": "Middle East",
  "Kuwait": "Middle East",
  "Oman": "Middle East",
  // Africa
  "Kenya": "Africa",
  "Egypt": "Africa",
  "South Africa": "Africa",
  "Ghana": "Africa",
  "Morocco": "Africa",
  "Nigeria": "Africa",
  "Ethiopia": "Africa",
  "Tanzania": "Africa",
  "Algeria": "Africa",
  "Angola": "Africa",
  // Oceania
  "Australia": "Oceania",
  "New Zealand": "Oceania",
};

// Mapping: TopoJSON .name -> Continent (for DS2)
const GEO_TO_CONTINENT = {
  "United States of America": "North America",
  "Canada": "North America",
  "Mexico": "North America",
  "Brazil": "South America",
  "Colombia": "South America",
  "Peru": "South America",
  "Argentina": "South America",
  "Chile": "South America",
  "Venezuela": "South America",
  "Ecuador": "South America",
  "Bolivia": "South America",
  "Paraguay": "South America",
  "Uruguay": "South America",
  "United Kingdom": "Europe",
  "Germany": "Europe",
  "France": "Europe",
  "Italy": "Europe",
  "Spain": "Europe",
  "Netherlands": "Europe",
  "Sweden": "Europe",
  "Poland": "Europe",
  "Portugal": "Europe",
  "Belgium": "Europe",
  "Switzerland": "Europe",
  "Austria": "Europe",
  "Norway": "Europe",
  "Denmark": "Europe",
  "Finland": "Europe",
  "Greece": "Europe",
  "Czechia": "Europe",
  "Hungary": "Europe",
  "Romania": "Europe",
  "Ukraine": "Europe",
  "Russia": "Europe",
  "China": "Asia",
  "Japan": "Asia",
  "South Korea": "Asia",
  "Taiwan": "Asia",
  "India": "Asia",
  "Pakistan": "Asia",
  "Bangladesh": "Asia",
  "Sri Lanka": "Asia",
  "Nepal": "Asia",
  "Indonesia": "Asia",
  "Vietnam": "Asia",
  "Singapore": "Asia",
  "Thailand": "Asia",
  "Philippines": "Asia",
  "Malaysia": "Asia",
  "United Arab Emirates": "Asia",
  "Jordan": "Asia",
  "Israel": "Asia",
  "Qatar": "Asia",
  "Saudi Arabia": "Asia",
  "Iraq": "Asia",
  "Iran": "Asia",
  "Turkey": "Asia",
  "Kazakhstan": "Asia",
  "Kenya": "Africa",
  "Egypt": "Africa",
  "South Africa": "Africa",
  "Ghana": "Africa",
  "Morocco": "Africa",
  "Nigeria": "Africa",
  "Ethiopia": "Africa",
  "Tanzania": "Africa",
  "Algeria": "Africa",
  "Angola": "Africa",
  "Australia": "Oceania",
  "New Zealand": "Oceania",
};

// DS2 Location string -> Continent
const DS2_LOC_TO_CONTINENT = {
  "UK": "Europe",
  "USA": "North America",
  "Canada": "North America",
  "Australia": "Oceania",
  "Germany": "Europe",
  "China": "Asia",
  "India": "Asia",
  "France": "Europe",
  "Japan": "Asia",
  "Brazil": "South America",
  "South Korea": "Asia",
  "Italy": "Europe",
  "Spain": "Europe",
  "Mexico": "North America",
  "Netherlands": "Europe",
  "Russia": "Europe",
  "Switzerland": "Europe",
  "Sweden": "Europe",
  "Singapore": "Asia",
  "New Zealand": "Oceania",
  "South Africa": "Africa",
  "Egypt": "Africa",
  "Nigeria": "Africa",
  "Argentina": "South America",
  "Chile": "South America",
  "Colombia": "South America",
  "Saudi Arabia": "Asia",
  "UAE": "Asia",
  "United Arab Emirates": "Asia",
  "Israel": "Asia",
  "Poland": "Europe",
  "Indonesia": "Asia",
  "Malaysia": "Asia",
  "Thailand": "Asia",
  "Vietnam": "Asia",
  "Philippines": "Asia",
  "Pakistan": "Asia",
  "Bangladesh": "Asia",
  "Ireland": "Europe",
  "Denmark": "Europe",
  "Finland": "Europe",
  "Norway": "Europe",
  "Belgium": "Europe",
  "Austria": "Europe",
  "Portugal": "Europe",
  "Greece": "Europe",
  "Turkey": "Asia",
  "Iran": "Asia",
  "Iraq": "Asia",
  "Qatar": "Asia",
  "Kuwait": "Asia",
  "Jordan": "Asia",
  "Taiwan": "Asia",
  "Hong Kong": "Asia",
  "Nepal": "Asia",
  "Sri Lanka": "Asia",
  "Myanmar": "Asia",
  "Cambodia": "Asia",
  "Kenya": "Africa",
  "Morocco": "Africa",
  "Ghana": "Africa",
  "Tanzania": "Africa",
  "Ethiopia": "Africa",
  "Algeria": "Africa",
  "Angola": "Africa",
  "Peru": "South America",
  "Ecuador": "South America",
  "Venezuela": "South America",
};

const SALARY_PALETTE = ["#d73027", "#fc8d59", "#fee08b", "#91cf60", "#1a9850"];
const INTENSITY_PALETTE = ["#1a9850", "#91cf60", "#fee08b", "#fc8d59", "#d73027"];

function Task1({ scrollParentRef, onStageChange }) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const fixedRef = useRef(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [metric, setMetric] = useState("salary");
  const [geoData, setGeoData] = useState(null);
  const [ds1, setDs1] = useState(null);
  const [ds2, setDs2] = useState(null);

  // Load data
  useEffect(() => {
    Promise.all([
      d3.json(`${baseUrl}world-110m.json`),       // local file (has properties.name already)
      d3.csv(`${baseUrl}ai_impact_jobs_2010_2025.csv`),
      d3.csv(`${baseUrl}ai_job_trends_dataset.csv`),
    ]).then(([world, csv1, csv2]) => {
      // geo features - local file already has name in properties
      const features = topojson.feature(world, world.objects.countries).features;
      setGeoData(features);

      // DS1: group by `region` (lowercase column name confirmed)
      const regionGroups = d3.group(csv1, (d) => d.region);
      const ds1Map = new Map();
      for (const [region, rows] of regionGroups) {
        if (!region) continue;
        const byCountryMap = d3.rollup(
          rows,
          (v) => ({
            avgSalary: d3.mean(v, (r) => +r.salary_usd) || 0,
            avgIntensity: d3.mean(v, (r) => +r.ai_intensity_score) || 0,
          }),
          (r) => r.country
        );
        const countries = Array.from(byCountryMap, ([name, vals]) => ({ name, ...vals }))
          .sort((a, b) => b.avgSalary - a.avgSalary);
        ds1Map.set(region, {
          avgSalary: d3.mean(rows, (r) => +r.salary_usd) || 0,
          avgIntensity: d3.mean(rows, (r) => +r.ai_intensity_score) || 0,
          countries,
        });
      }
      setDs1(ds1Map);

      // DS2: group Location -> continent
      const continentAccum = new Map();
      csv2.forEach((d) => {
        const loc = d.Location;
        const cont = DS2_LOC_TO_CONTINENT[loc];
        if (!cont) return;
        if (!continentAccum.has(cont)) continentAccum.set(cont, []);
        continentAccum.get(cont).push(d);
      });

      const ds2Map = new Map();
      for (const [continent, rows] of continentAccum) {
        const byLocMap = d3.rollup(
          rows,
          (v) => ({
            avgSalary: d3.mean(v, (r) => +r["Median Salary (USD)"]) || 0,
            avgIntensity: d3.mean(v, (r) => +r["Automation Risk (%)"]) / 100 || 0,
          }),
          (r) => r.Location
        );
        const countries = Array.from(byLocMap, ([name, vals]) => ({ name, ...vals }))
          .sort((a, b) => b.avgSalary - a.avgSalary);
        ds2Map.set(continent, {
          avgSalary: d3.mean(rows, (r) => +r["Median Salary (USD)"]) || 0,
          avgIntensity: d3.mean(rows, (r) => +r["Automation Risk (%)"]) / 100 || 0,
          countries,
        });
      }
      setDs2(ds2Map);
    });
  }, []);

  // Scroll listener
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
      if (onStageChange) onStageChange(p < 0.2 ? 0 : p < 0.65 ? 1 : 2);
    };
    container.addEventListener("scroll", handle, { passive: true });
    handle();
    return () => container.removeEventListener("scroll", handle);
  }, [scrollParentRef, onStageChange]);

  // Render map
  useEffect(() => {
    if (!geoData || !ds1 || !ds2 || !svgRef.current) return;

    const W = 1000, H = 500;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const projection = d3.geoNaturalEarth1().scale(175).translate([W / 2, H / 2]);
    const pathGen = d3.geoPath().projection(projection);
    const g = svg.append("g");
    const tip = d3.select(tooltipRef.current);

    const frame = scrollProgress < 0.2 ? "base" : scrollProgress < 0.65 ? "ds1" : "ds2";

    // Unified color scales across both datasets for consistency
    const allSalaries = [
      ...Array.from(ds1.values()).map((d) => d.avgSalary),
      ...Array.from(ds2.values()).map((d) => d.avgSalary),
    ].filter((v) => v > 0);
    const allIntensities = [
      ...Array.from(ds1.values()).map((d) => d.avgIntensity),
      ...Array.from(ds2.values()).map((d) => d.avgIntensity),
    ].filter((v) => v > 0);

    const salaryScale = d3.scaleQuantize()
      .domain(d3.extent(allSalaries))
      .range(SALARY_PALETTE);
    const intensityScale = d3.scaleQuantize()
      .domain(d3.extent(allIntensities))
      .range(INTENSITY_PALETTE);

    const getColor = (geoName) => {
      if (frame === "base") return "#e8edf2";

      if (frame === "ds1") {
        const region = GEO_TO_DS1_REGION[geoName];
        if (!region) return "#dde3ea";
        const stats = ds1.get(region);
        if (!stats) return "#dde3ea";
        const val = metric === "salary" ? stats.avgSalary : stats.avgIntensity;
        return metric === "salary" ? salaryScale(val) : intensityScale(val);
      }

      // ds2
      const continent = GEO_TO_CONTINENT[geoName];
      if (!continent) return "#dde3ea";
      const stats = ds2.get(continent);
      if (!stats) return "#dde3ea";
      const val = metric === "salary" ? stats.avgSalary : stats.avgIntensity;
      return metric === "salary" ? salaryScale(val) : intensityScale(val);
    };

    // Build tooltip HTML
    const buildTip = (geoName) => {
      if (frame === "base") {
        return `<div class="tp-title">${geoName}</div><div class="tp-note">Scroll down to reveal data</div>`;
      }

      if (frame === "ds1") {
        const region = GEO_TO_DS1_REGION[geoName];
        if (!region) return `<div class="tp-title">${geoName}</div><div class="tp-note">No DS1 data for this country</div>`;
        const stats = ds1.get(region);
        const avgLabel = metric === "salary"
          ? `$${Math.round(stats.avgSalary).toLocaleString()}`
          : `${(stats.avgIntensity * 100).toFixed(1)}%`;
        const rows = stats.countries.slice(0, 8).map((c) => {
          const v = metric === "salary"
            ? `$${Math.round(c.avgSalary).toLocaleString()}`
            : `${(c.avgIntensity * 100).toFixed(1)}%`;
          return `<div class="tp-row"><span class="tp-label">${c.name}</span><span class="tp-val">${v}</span></div>`;
        }).join("");
        return `
          <div class="tp-title">${region}</div>
          <div class="tp-subtitle">2010-2025 · ${metric === "salary" ? "Avg Salary" : "Avg AI Intensity"}: <b>${avgLabel}</b></div>
          <div class="tp-divider"></div>
          <div class="tp-country-header">Some average data of the country in ${region}:</div>
          ${rows}
        `;
      }

      // ds2
      const continent = GEO_TO_CONTINENT[geoName];
      if (!continent) return `<div class="tp-title">${geoName}</div><div class="tp-note">No DS2 data for this country</div>`;
      const stats = ds2.get(continent);
      if (!stats) return `<div class="tp-title">${geoName} (${continent})</div><div class="tp-note">No DS2 data for this continent</div>`;
      const avgLabel = metric === "salary"
        ? `$${Math.round(stats.avgSalary).toLocaleString()}`
        : `${(stats.avgIntensity * 100).toFixed(1)}%`;
      const rows = stats.countries.slice(0, 8).map((c) => {
        const v = metric === "salary"
          ? `$${Math.round(c.avgSalary).toLocaleString()}`
          : `${(c.avgIntensity * 100).toFixed(1)}%`;
        return `<div class="tp-row"><span class="tp-label">${c.name}</span><span class="tp-val">${v}</span></div>`;
      }).join("");
      return `
        <div class="tp-title">${continent}</div>
        <div class="tp-subtitle">2024-2030 · ${metric === "salary" ? "Avg Salary" : "Avg AI Risk"}: <b>${avgLabel}</b></div>
        <div class="tp-divider"></div>
        <div class="tp-country-header">Countries in this continent:</div>
        ${rows}
      `;
    };

    // Draw
    g.selectAll("path")
      .data(geoData)
      .enter()
      .append("path")
      .attr("class", "country-path")
      .attr("d", pathGen)
      .attr("fill", (d) => getColor(d.properties.name))
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

    // Update legend
    const domain = metric === "salary" ? d3.extent(allSalaries) : d3.extent(allIntensities);
    const palette = metric === "salary" ? SALARY_PALETTE : INTENSITY_PALETTE;
    const step = (domain[1] - domain[0]) / palette.length;

    const binsWrap = fixedRef.current?.querySelector(".legend-bins-wrap");
    if (binsWrap) {
      binsWrap.innerHTML = palette.map((color, i) => {
        const lo = domain[0] + step * i;
        const hi = domain[0] + step * (i + 1);
        const loStr = metric === "salary" ? `$${Math.round(lo / 1000)}k` : `${(lo * 100).toFixed(0)}%`;
        const hiStr = metric === "salary" ? `$${Math.round(hi / 1000)}k` : `${(hi * 100).toFixed(0)}%`;
        return `<div class="legend-bin">
          <span class="legend-swatch" style="background:${color}"></span>
          <span>${loStr} — ${hiStr}</span>
        </div>`;
      }).join("");
    }

    const legendTitle = fixedRef.current?.querySelector(".legend-title");
    if (legendTitle) legendTitle.textContent = metric === "salary" ? "Salary Range (USD)" : "AI Intensity / Risk";

    // Update badge
    const badgeMain = fixedRef.current?.querySelector(".badge-main");
    const badgeSub = fixedRef.current?.querySelector(".badge-sub");
    if (badgeMain) {
      badgeMain.textContent = frame === "base"
        ? "Scroll to reveal AI impact data"
        : frame === "ds1"
          ? "Dataset 1: Global AI Impact (2010-2025)"
          : "Dataset 2: AI Job Trends (2024-2030)";
    }
    if (badgeSub) {
      badgeSub.textContent = frame === "base"
        ? "Three stages: blank · historical regions · future continents"
        : frame === "ds1"
          ? "Colored by Region · Hover for country breakdown"
          : "Colored by Continent · Hover for country breakdown";
    }
  }, [geoData, ds1, ds2, metric, scrollProgress]);

  const frame = scrollProgress < 0.2 ? "base" : scrollProgress < 0.65 ? "ds1" : "ds2";

  return (
    <div className="task1-scroll-container">
      <div className="task1-fixed-viewport" ref={fixedRef}>

        <div className="dataset-badge">
          <div className="badge-main">Scroll to reveal AI impact data</div>
          <div className="badge-sub">Three stages: blank · historical regions · future continents</div>
        </div>

        <svg ref={svgRef} viewBox="0 0 1000 500" className="task1-map-svg" />
        <div ref={tooltipRef} className="task1-tooltip" />

        <div className="stage-dots">
          {[["base","Blank Canvas"],["ds1","DS1: 2010-2025"],["ds2","DS2: 2024-2030"]].map(([key,label]) => (
            <div key={key} className={`stage-dot-wrap ${frame === key ? "active" : ""}`}>
              <div className="stage-dot" />
              <span className="stage-dot-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="metric-toggle">
          <button className={metric === "salary" ? "active" : ""} onClick={() => setMetric("salary")}>
            <DollarSign size={16} className="icon" /> Avg Salary
          </button>
          <button className={metric === "intensity" ? "active" : ""} onClick={() => setMetric("intensity")}>
            <Bot size={16} className="icon" /> AI Intensity / Risk
          </button>
        </div>

        <div className="legend-container">
          <div className="legend-title">Salary Range (USD)</div>
          <div className="legend-bins-wrap" />
        </div>

      </div>
    </div>
  );
}

export default Task1;
