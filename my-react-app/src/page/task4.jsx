import React, { useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import "./task4.css";

const IMPACT_COLORS = {
  Low: "#2a9d8f",
  Moderate: "#e9c46a",
  High: "#e76f51",
  default: "#4b5563",
};

const STATUS_COLORS = {
  Increasing: "#0f766e",
  Decreasing: "#b91c1c",
  default: "#6b7280",
};

function linearRegression(points) {
  if (!points.length) {
    return { slope: 0, intercept: 0 };
  }

  const n = points.length;
  const sumX = d3.sum(points, (d) => d.x);
  const sumY = d3.sum(points, (d) => d.y);
  const sumXY = d3.sum(points, (d) => d.x * d.y);
  const sumXX = d3.sum(points, (d) => d.x * d.x);
  const denominator = n * sumXX - sumX * sumX;

  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function trimText(value, max = 38) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function formatCount(value) {
  return d3.format(",")(Math.round(value || 0));
}

function tickValues(domain, count = 5) {
  const [minValue, maxValue] = domain;
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return [];
  }

  if (minValue === maxValue) {
    return [minValue];
  }

  return d3.ticks(minValue, maxValue, count);
}

function GroupedBarChart({ data }) {
  const width = 960;
  const height = 360;
  const margin = { top: 20, right: 18, bottom: 68, left: 54 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const x0 = d3.scaleBand().domain(data.map((d) => d.industry)).range([0, innerWidth]).padding(0.18);
  const x1 = d3.scaleBand().domain(["2024", "2030"]).range([0, x0.bandwidth()]).padding(0.12);
  const yMax = d3.max(data, (d) => Math.max(d.openings2024, d.openings2030)) || 0;
  const y = d3.scaleLinear().domain([0, yMax * 1.08 || 1]).range([innerHeight, 0]).nice();
  const yTicks = tickValues(y.domain(), 5);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="task4-svg" role="img" aria-label="Industry openings comparison chart">
      <g transform={`translate(${margin.left},${margin.top})`}>
        {yTicks.map((tick) => {
          const yPos = y(tick);
          return (
            <g key={tick} transform={`translate(0,${yPos})`}>
              <line x1="0" x2={innerWidth} stroke="#e2e8f0" strokeDasharray="3 4" />
              <text x="-10" y="4" textAnchor="end" fill="#64748b" fontSize="11">
                {formatCount(tick)}
              </text>
            </g>
          );
        })}

        {data.map((d) => (
          <g key={d.industry} transform={`translate(${x0(d.industry) || 0},0)`}>
            {[
              { key: "2024", value: d.openings2024, color: "#264653" },
              { key: "2030", value: d.openings2030, color: "#2a9d8f" },
            ].map((series) => (
              <rect
                key={series.key}
                x={x1(series.key)}
                y={y(series.value)}
                width={x1.bandwidth()}
                height={innerHeight - y(series.value)}
                rx="6"
                fill={series.color}
              >
                <title>
                  {d.industry} {series.key}: {formatCount(series.value)}
                </title>
              </rect>
            ))}
            <text
              x={x0.bandwidth() / 2}
              y={innerHeight + 28}
              textAnchor="middle"
              fill="#475569"
              fontSize="11"
            >
              {trimText(d.industry, 12)}
            </text>
          </g>
        ))}

        <line x1="0" y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="#0f172a" strokeWidth="1.4" />
        <line x1="0" y1="0" x2="0" y2={innerHeight} stroke="#0f172a" strokeWidth="1.4" />
        <text x={innerWidth / 2} y={innerHeight + 50} textAnchor="middle" fill="#334155" fontSize="12" fontWeight="600">
          Industry
        </text>
        <text
          x={-innerHeight / 2}
          y="-38"
          transform="rotate(-90)"
          textAnchor="middle"
          fill="#334155"
          fontSize="12"
          fontWeight="600"
        >
          Openings
        </text>
      </g>
    </svg>
  );
}

function ScatterChart({ rows, trendline, impactColors, sizeScale }) {
  const width = 960;
  const height = 360;
  const margin = { top: 20, right: 18, bottom: 54, left: 58 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]).nice();
  const yExtent = d3.extent(rows, (d) => d.growthPct);
  const yMin = Math.min(0, yExtent[0] ?? 0);
  const yMax = Math.max(0, yExtent[1] ?? 0);
  const y = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]).nice();
  const xTicks = tickValues(x.domain(), 5);
  const yTicks = tickValues(y.domain(), 5);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="task4-svg" role="img" aria-label="Growth versus automation risk scatter chart">
      <g transform={`translate(${margin.left},${margin.top})`}>
        {xTicks.map((tick) => {
          const xPos = x(tick);
          return (
            <g key={tick} transform={`translate(${xPos},0)`}>
              <line y1="0" y2={innerHeight} stroke="#eef2f7" strokeDasharray="3 4" />
              <text x="0" y={innerHeight + 18} textAnchor="middle" fill="#64748b" fontSize="11">
                {tick.toFixed(0)}
              </text>
            </g>
          );
        })}

        {yTicks.map((tick) => {
          const yPos = y(tick);
          return (
            <g key={tick} transform={`translate(0,${yPos})`}>
              <line x1="0" x2={innerWidth} stroke="#eef2f7" strokeDasharray="3 4" />
              <text x="-10" y="4" textAnchor="end" fill="#64748b" fontSize="11">
                {tick.toFixed(0)}%
              </text>
            </g>
          );
        })}

        {trendline.length === 2 && (
          <line
            x1={x(trendline[0].x)}
            y1={y(trendline[0].y)}
            x2={x(trendline[1].x)}
            y2={y(trendline[1].y)}
            stroke="#1d3557"
            strokeWidth="3"
            strokeDasharray="5 5"
          />
        )}

        {rows.map((d) => (
          <g key={`${d.jobTitle}-${d.industry}-${d.location}`} transform={`translate(${x(d.automationRisk)},${y(d.growthPct)})`}>
            <circle
              r={sizeScale(d.openings2030)}
              fill={impactColors[d.impactLevel] || impactColors.default}
              fillOpacity="0.58"
              stroke="#ffffff"
              strokeWidth="0.8"
            >
              <title>
                {d.jobTitle}
                {"\n"}
                {d.industry}
                {"\n"}
                Automation Risk: {d.automationRisk.toFixed(1)}%
                {"\n"}
                Growth: {d.growthPct.toFixed(1)}%
                {"\n"}
                Projected 2030 Openings: {formatCount(d.openings2030)}
              </title>
            </circle>
          </g>
        ))}

        <line x1="0" y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="#0f172a" strokeWidth="1.4" />
        <line x1="0" y1="0" x2="0" y2={innerHeight} stroke="#0f172a" strokeWidth="1.4" />
        <text x={innerWidth / 2} y={innerHeight + 42} textAnchor="middle" fill="#334155" fontSize="12" fontWeight="600">
          Automation Risk (%)
        </text>
        <text
          x={-innerHeight / 2}
          y="-42"
          transform="rotate(-90)"
          textAnchor="middle"
          fill="#334155"
          fontSize="12"
          fontWeight="600"
        >
          Growth from 2024 to 2030 (%)
        </text>
      </g>
    </svg>
  );
}

function HorizontalBarChart({ data, statusColors }) {
  const width = 960;
  const height = 360;
  const margin = { top: 20, right: 18, bottom: 48, left: 220 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const y = d3.scaleBand().domain(data.map((d) => d.jobTitle)).range([0, innerHeight]).padding(0.24);
  const xMax = d3.max(data, (d) => d.growthAbsolute) || 1;
  const x = d3.scaleLinear().domain([0, xMax * 1.08]).range([0, innerWidth]).nice();
  const xTicks = tickValues(x.domain(), 5);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="task4-svg" role="img" aria-label="Top roles by net new openings chart">
      <g transform={`translate(${margin.left},${margin.top})`}>
        {xTicks.map((tick) => {
          const xPos = x(tick);
          return (
            <g key={tick} transform={`translate(${xPos},0)`}>
              <line y1="0" y2={innerHeight} stroke="#eef2f7" strokeDasharray="3 4" />
              <text x="0" y={innerHeight + 18} textAnchor="middle" fill="#64748b" fontSize="11">
                {formatCount(tick)}
              </text>
            </g>
          );
        })}

        {data.map((d) => {
          const barY = y(d.jobTitle) || 0;
          return (
            <g key={d.jobTitle} transform={`translate(0,${barY})`}>
              <text x="-12" y={y.bandwidth() / 2 + 4} textAnchor="end" fill="#334155" fontSize="11">
                {trimText(d.jobTitle, 30)}
              </text>
              <rect x="0" y="0" width={x(d.growthAbsolute)} height={y.bandwidth()} rx="6" fill={statusColors[d.status] || statusColors.default}>
                <title>
                  {d.jobTitle}
                  {"\n"}
                  Net new openings: {formatCount(d.growthAbsolute)}
                  {"\n"}
                  Growth rate: {d.growthPct.toFixed(1)}%
                  {"\n"}
                  Avg automation risk: {d.avgRisk.toFixed(1)}%
                </title>
              </rect>
              <text x={x(d.growthAbsolute) + 8} y={y.bandwidth() / 2 + 4} fill="#475569" fontSize="11">
                {formatCount(d.growthAbsolute)}
              </text>
            </g>
          );
        })}

        <line x1="0" y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="#0f172a" strokeWidth="1.4" />
        <line x1="0" y1="0" x2="0" y2={innerHeight} stroke="#0f172a" strokeWidth="1.4" />
        <text x={innerWidth / 2} y={innerHeight + 42} textAnchor="middle" fill="#334155" fontSize="12" fontWeight="600">
          Net New Openings (2030 - 2024)
        </text>
      </g>
    </svg>
  );
}

function parseRow(row) {
  const openings2024 = +row["Job Openings (2024)"];
  const openings2030 = +row["Projected Openings (2030)"];
  const growthAbsolute = openings2030 - openings2024;
  const growthPct = openings2024 > 0 ? (growthAbsolute / openings2024) * 100 : 0;

  return {
    jobTitle: row["Job Title"],
    industry: row.Industry,
    jobStatus: row["Job Status"],
    impactLevel: row["AI Impact Level"],
    salary: +row["Median Salary (USD)"],
    education: row["Required Education"],
    experience: +row["Experience Required (Years)"],
    openings2024,
    openings2030,
    growthAbsolute,
    growthPct,
    remoteRatio: +row["Remote Work Ratio (%)"],
    automationRisk: +row["Automation Risk (%)"],
    location: row.Location,
    genderDiversity: +row["Gender Diversity (%)"],
  };
}

function Task4() {
  const [rows, setRows] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState("All");
  const [selectedImpact, setSelectedImpact] = useState("All");

  useEffect(() => {
    const loadData = async () => {
      const baseUrl = import.meta.env.BASE_URL;
      const raw = await d3.csv(`${baseUrl}ai_job_trends_dataset.csv`);
      setRows(raw.map(parseRow));
    };

    loadData().catch((error) => {
      console.error("Failed to load task 4 dataset", error);
    });
  }, []);

  const industries = useMemo(() => {
    return ["All", ...new Set(rows.map((d) => d.industry))];
  }, [rows]);

  const impactLevels = useMemo(() => {
    return ["All", ...new Set(rows.map((d) => d.impactLevel))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const industryMatch = selectedIndustry === "All" || row.industry === selectedIndustry;
      const impactMatch = selectedImpact === "All" || row.impactLevel === selectedImpact;
      return industryMatch && impactMatch;
    });
  }, [rows, selectedIndustry, selectedImpact]);

  const kpis = useMemo(() => {
    if (!filteredRows.length) {
      return {
        total2024: 0,
        total2030: 0,
        growthPct: 0,
        increasingShare: 0,
      };
    }

    const total2024 = d3.sum(filteredRows, (d) => d.openings2024);
    const total2030 = d3.sum(filteredRows, (d) => d.openings2030);
    const increasingShare = (d3.mean(filteredRows, (d) => (d.jobStatus === "Increasing" ? 1 : 0)) || 0) * 100;

    return {
      total2024,
      total2030,
      growthPct: total2024 > 0 ? ((total2030 - total2024) / total2024) * 100 : 0,
      increasingShare,
    };
  }, [filteredRows]);

  const industryForecast = useMemo(() => {
    return d3
      .rollups(
        filteredRows,
        (v) => ({
          openings2024: d3.sum(v, (d) => d.openings2024),
          openings2030: d3.sum(v, (d) => d.openings2030),
        }),
        (d) => d.industry,
      )
      .map(([industry, stats]) => ({
        industry,
        ...stats,
        growthAbsolute: stats.openings2030 - stats.openings2024,
      }))
      .sort((a, b) => d3.descending(a.growthAbsolute, b.growthAbsolute));
  }, [filteredRows]);

  const scatterRows = useMemo(() => {
    if (filteredRows.length <= 8000) {
      return filteredRows;
    }

    const stride = Math.ceil(filteredRows.length / 8000);
    return filteredRows.filter((_, index) => index % stride === 0);
  }, [filteredRows]);

  const scatterTrendline = useMemo(() => {
    if (!scatterRows.length) {
      return { x: [], y: [] };
    }

    const regression = linearRegression(scatterRows.map((d) => ({ x: d.automationRisk, y: d.growthPct })));
    const [minX, maxX] = d3.extent(scatterRows, (d) => d.automationRisk);

    return {
      x: [minX, maxX],
      y: [regression.slope * minX + regression.intercept, regression.slope * maxX + regression.intercept],
    };
  }, [scatterRows]);

  const topRoles = useMemo(() => {
    return d3
      .rollups(
        filteredRows,
        (v) => ({
          openings2024: d3.sum(v, (d) => d.openings2024),
          openings2030: d3.sum(v, (d) => d.openings2030),
          avgRisk: d3.mean(v, (d) => d.automationRisk) || 0,
          count: v.length,
          status: v[0].jobStatus,
        }),
        (d) => d.jobTitle,
      )
      .map(([jobTitle, stats]) => ({
        jobTitle,
        ...stats,
        growthAbsolute: stats.openings2030 - stats.openings2024,
        growthPct: stats.openings2024 > 0 ? ((stats.openings2030 - stats.openings2024) / stats.openings2024) * 100 : 0,
      }))
      .sort((a, b) => d3.descending(a.growthAbsolute, b.growthAbsolute))
      .slice(0, 12)
      .reverse();
  }, [filteredRows]);

  const riskSizeScale = useMemo(() => {
    const maxOpenings = d3.max(scatterRows, (d) => d.openings2030) || 1;
    return d3.scaleSqrt().domain([0, maxOpenings]).range([5, 26]);
  }, [scatterRows]);

  return (
    <div className="task4-page" id="task-4">
      <div className="task4-header">
        <h2>Task 4: 2030 Prediction Dashboard</h2>
        <p>
          Forecast lens based on openings growth from 2024 to 2030, tied with automation risk and AI impact level.
        </p>
      </div>

      <div className="task4-filters">
        <label>
          Industry
          <select value={selectedIndustry} onChange={(e) => setSelectedIndustry(e.target.value)}>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </label>

        <label>
          AI Impact Level
          <select value={selectedImpact} onChange={(e) => setSelectedImpact(e.target.value)}>
            {impactLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="task4-kpis">
        <article>
          <h4>2024 Openings</h4>
          <strong>{d3.format(",")(kpis.total2024)}</strong>
        </article>
        <article>
          <h4>2030 Projected</h4>
          <strong>{d3.format(",")(kpis.total2030)}</strong>
        </article>
        <article>
          <h4>Projected Growth</h4>
          <strong>{kpis.growthPct.toFixed(1)}%</strong>
        </article>
        <article>
          <h4>Increasing Roles</h4>
          <strong>{kpis.increasingShare.toFixed(1)}%</strong>
        </article>
      </div>

      <section className="task4-chart-card task4-chart-card-wide">
        <header>
          <h3>Industry Openings: 2024 vs 2030</h3>
          <span>Bars compare current demand against projected demand by industry.</span>
        </header>
        <GroupedBarChart data={industryForecast} />
      </section>

      <div className="task4-chart-grid">
        <section className="task4-chart-card">
          <header>
            <h3>Growth vs Automation Risk</h3>
            <span>Each point is a role. Bubble size reflects projected openings in 2030.</span>
          </header>
          <ScatterChart rows={scatterRows} trendline={scatterTrendline} impactColors={IMPACT_COLORS} sizeScale={riskSizeScale} />

          <div className="task4-legend-inline">
            {Object.entries(IMPACT_COLORS)
              .filter(([key]) => key !== "default")
              .map(([level, color]) => (
                <span key={level}>
                  <i style={{ background: color }} />
                  {level}
                </span>
              ))}
          </div>
        </section>

        <section className="task4-chart-card">
          <header>
            <h3>Top Roles by Net New Openings</h3>
            <span>Highest positive delta between projected 2030 and baseline 2024 openings.</span>
          </header>
          <HorizontalBarChart data={topRoles} statusColors={STATUS_COLORS} />
        </section>
      </div>
    </div>
  );
}

export default Task4;
