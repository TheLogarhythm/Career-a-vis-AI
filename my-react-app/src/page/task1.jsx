import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import "./task1.css";

const REGION_COLORS = d3.scaleOrdinal([
  "#0a9396",
  "#ee9b00",
  "#9b2226",
  "#005f73",
  "#ca6702",
  "#6d597a",
  "#3a86ff",
  "#2a9d8f",
  "#457b9d"
]);

const INDUSTRY_COLORS = d3.scaleOrdinal(d3.schemeTableau10);

const REGION_ANCHORS = {
  Africa: [20, 6],
  "East Asia": [115, 30],
  Europe: [12, 52],
  "Middle East": [45, 30],
  "North America": [-100, 40],
  Oceania: [140, -25],
  "South America": [-60, -15],
  "South Asia": [78, 20],
  "Southeast Asia": [105, 7]
};

const COUNTRY_COORDS = {
  Argentina: [-63.6, -38.4],
  Australia: [133.8, -25.3],
  Bangladesh: [90.3, 23.7],
  Brazil: [-51.9, -14.2],
  Canada: [-106.3, 56.1],
  Chile: [-71.5, -35.7],
  China: [104.2, 35.9],
  Colombia: [-74.1, 4.6],
  Egypt: [30.8, 26.8],
  France: [2.2, 46.2],
  Germany: [10.4, 51.2],
  Ghana: [-1.0, 7.9],
  India: [78.9, 21.0],
  Indonesia: [113.9, -0.8],
  Israel: [34.8, 31.0],
  Italy: [12.6, 41.9],
  Japan: [138.3, 36.2],
  Jordan: [36.2, 31.2],
  Kenya: [37.9, 0.0],
  Malaysia: [102.0, 4.2],
  Mexico: [-102.5, 23.6],
  Morocco: [-7.1, 31.8],
  Nepal: [84.1, 28.4],
  Netherlands: [5.3, 52.1],
  "New Zealand": [174.9, -40.9],
  Nigeria: [8.7, 9.1],
  Pakistan: [69.3, 30.4],
  Peru: [-75.0, -9.2],
  Philippines: [121.8, 12.8],
  Poland: [19.1, 51.9],
  Qatar: [51.2, 25.3],
  "Saudi Arabia": [45.1, 23.9],
  Singapore: [103.8, 1.35],
  "South Africa": [24.9, -30.6],
  "South Korea": [127.8, 36.5],
  Spain: [-3.7, 40.4],
  "Sri Lanka": [80.7, 7.9],
  Sweden: [18.6, 60.1],
  Taiwan: [121.0, 23.7],
  Thailand: [100.99, 15.9],
  UAE: [54.4, 24.4],
  "United Kingdom": [-3.4, 55.4],
  "United States": [-98.6, 39.8],
  Vietnam: [108.3, 14.1]
};

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function resolveCoordinates(country, region) {
  if (COUNTRY_COORDS[country]) {
    return COUNTRY_COORDS[country];
  }

  const [baseLon, baseLat] = REGION_ANCHORS[region] || [0, 0];
  const seed = hashString(country);
  const lonOffset = (seed % 24) - 12;
  const latOffset = (Math.floor(seed / 24) % 14) - 7;
  return [baseLon + lonOffset, baseLat + latOffset];
}

function normalizeHistoryRow(row) {
  const [lon, lat] = resolveCoordinates(row.country, row.region);

  return {
    postingYear: +row.posting_year,
    country: row.country,
    region: row.region,
    industry: row.industry,
    aiIntensityScore: +row.ai_intensity_score,
    salaryUsd: +row.salary_usd,
    salaryDeltaPct: +row.salary_change_vs_prev_year_percent,
    automationRiskScore: +row.automation_risk_score,
    aiMentioned: row.ai_mentioned === "True",
    reskillingRequired: row.reskilling_required === "True",
    displacementRisk: row.ai_job_displacement_risk,
    lon,
    lat
  };
}

function normalizeMetricRow(row) {
  return {
    label: row.label,
    value: parseFloat(String(row.value).replace("%", ""))
  };
}

function computeRegionSummary(rows) {
  return d3
    .rollups(
      rows,
      (values) => ({
        lon: d3.mean(values, (d) => d.lon) || 0,
        lat: d3.mean(values, (d) => d.lat) || 0,
        aiIntensity: d3.mean(values, (d) => d.aiIntensityScore) || 0,
        salary: d3.mean(values, (d) => d.salaryUsd) || 0,
        count: values.length
      }),
      (d) => d.region
    )
    .map(([region, stats]) => ({ region, ...stats }))
    .sort((a, b) => d3.descending(a.aiIntensity, b.aiIntensity));
}

function computeStarMetrics(rows, metricRows) {
  if (!rows.length) {
    return [];
  }

  const coreMetrics = [
    {
      label: "AI Mention",
      value: (d3.mean(rows, (d) => (d.aiMentioned ? 1 : 0)) || 0) * 100
    },
    {
      label: "Intensity",
      value: (d3.mean(rows, (d) => d.aiIntensityScore) || 0) * 100
    },
    {
      label: "Reskilling",
      value: (d3.mean(rows, (d) => (d.reskillingRequired ? 1 : 0)) || 0) * 100
    },
    {
      label: "High Risk",
      value: (d3.mean(rows, (d) => (d.displacementRisk === "High" ? 1 : 0)) || 0) * 100
    },
    {
      label: "Salary Momentum",
      value: Math.min(100, Math.max(0, (d3.mean(rows, (d) => d.salaryDeltaPct) || 0) * 4 + 50))
    }
  ];

  const fileMetrics = metricRows
    .filter((metric) => Number.isFinite(metric.value))
    .map((metric) => ({
      label: metric.label,
      value: Math.max(0, Math.min(100, metric.value))
    }));

  return [...coreMetrics, ...fileMetrics].slice(0, 8);
}

function drawGlobeScene(layer, regionSummary, worldData, width, height, currentRotation) {
  layer.selectAll("*").remove();

  const globeCenterX = width / 2;
  const globeCenterY = height / 2 + 10;

  const projection = d3
    .geoOrthographic()
    .scale(Math.min(width, height) * 0.48)
    .translate([globeCenterX, globeCenterY])
    .rotate(currentRotation)
    .clipAngle(90)
    .precision(0.3);

  const path = d3.geoPath(projection);

  // 1. Water Layer (Circle/Sphere)
  layer
    .append("path")
    .datum({ type: "Sphere" })
    .attr("class", "globe-water")
    .attr("d", path);

  // 2. Graticules
  layer
    .append("path")
    .datum(d3.geoGraticule10())
    .attr("class", "globe-graticule")
    .attr("d", path);

  // 3. Land / Countries
  if (worldData) {
    const countries = topojson.feature(worldData, worldData.objects.countries);
    layer
      .append("path")
      .datum(countries)
      .attr("class", "globe-land")
      .attr("d", path);

    layer
      .append("path")
      .datum(topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b))
      .attr("class", "globe-borders")
      .attr("d", path);
  }

  const radiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(regionSummary, (d) => d.salary))
    .range([8, 24]);

  const markers = layer
    .append("g")
    .attr("class", "globe-markers")
    .selectAll("g")
    .data(regionSummary)
    .join("g")
    .attr("class", "region-marker");

  markers
    .append("circle")
    .attr("r", (d) => radiusScale(d.salary))
    .attr("fill", (d) => REGION_COLORS(d.region))
    .attr("fill-opacity", 0.9)
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5);

  markers
    .append("text")
    .attr("class", "region-label")
    .attr("y", (d) => -radiusScale(d.salary) - 7)
    .attr("text-anchor", "middle")
    .text((d) => d.region);

  const redraw = (rotation) => {
    projection.rotate(rotation);
    const center = [-rotation[0], -rotation[1]];

    layer.selectAll(".globe-water").attr("d", path);
    layer.selectAll(".globe-graticule").attr("d", path);
    layer.selectAll(".globe-land").attr("d", path);
    layer.selectAll(".globe-borders").attr("d", path);

    markers
      .attr("transform", (d) => {
        const point = projection([d.lon, d.lat]);
        return point ? `translate(${point[0]}, ${point[1]})` : "translate(-9999,-9999)";
      })
      .attr("display", (d) =>
        d3.geoDistance([d.lon, d.lat], center) < Math.PI / 2 ? null : "none"
      );
  };

  return { redraw };
}

function drawMapScene(layer, rows, selectedYear, width, height) {
  layer.selectAll("*").remove();

  const projection = d3
    .geoNaturalEarth1()
    .fitExtent(
      [
        [52, 58],
        [width - 52, height - 130]
      ],
      { type: "Sphere" }
    );

  const path = d3.geoPath(projection);
  const yearRows = rows.filter((row) => row.postingYear === selectedYear);

  const grouped = d3
    .rollups(
      yearRows,
      (values) => ({
        industry: values[0].industry,
        country: values[0].country,
        lon: d3.mean(values, (d) => d.lon) || 0,
        lat: d3.mean(values, (d) => d.lat) || 0,
        aiIntensity: d3.mean(values, (d) => d.aiIntensityScore) || 0,
        salary: d3.mean(values, (d) => d.salaryUsd) || 0,
        count: values.length
      }),
      (d) => `${d.country}__${d.industry}`
    )
    .map(([key, stats]) => ({ key, ...stats }));

  const radiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(grouped, (d) => d.salary))
    .range([3, 14]);

  const intensityScale = d3
    .scaleSequential(d3.interpolateYlOrRd)
    .domain([0.02, 0.95]);

  layer
    .append("path")
    .datum({ type: "Sphere" })
    .attr("class", "map-sphere")
    .attr("d", path);

  layer
    .append("path")
    .datum(d3.geoGraticule10())
    .attr("class", "map-graticule")
    .attr("d", path);

  layer
    .append("text")
    .attr("x", 64)
    .attr("y", 38)
    .attr("class", "scene-title")
    .text(`Year ${selectedYear}: AI Intensity (fill) + Salary (size) by industry dot`);

  layer
    .append("text")
    .attr("x", 64)
    .attr("y", 58)
    .attr("class", "scene-subtitle")
    .text(`${grouped.length} industry points across ${new Set(grouped.map((d) => d.country)).size} countries`);

  const dots = layer
    .append("g")
    .attr("class", "map-dots")
    .selectAll("circle")
    .data(grouped)
    .join("circle")
    .attr("cx", (d) => projection([d.lon, d.lat])[0])
    .attr("cy", (d) => projection([d.lon, d.lat])[1])
    .attr("r", 0)
    .attr("fill", (d) => intensityScale(d.aiIntensity))
    .attr("stroke", (d) => INDUSTRY_COLORS(d.industry))
    .attr("stroke-width", 1.6)
    .attr("fill-opacity", 0.82);

  dots
    .transition()
    .duration(500)
    .attr("r", (d) => radiusScale(d.salary));

  dots.append("title").text(
    (d) =>
      `${d.industry} in ${d.country}\nAI intensity: ${(d.aiIntensity * 100).toFixed(1)}%\nSalary: $${d3
        .format(",.0f")(d.salary)}\nSamples: ${d.count}`
  );
}

function drawStarScene(layer, metrics, width, height) {
  layer.selectAll("*").remove();

  const centerX = width / 2;
  const centerY = height / 2 + 10;
  const maxRadius = Math.min(width, height) * 0.24;

  layer
    .append("text")
    .attr("x", 64)
    .attr("y", 38)
    .attr("class", "scene-title")
    .text("AI Impact Statistics Star Chart");

  layer
    .append("text")
    .attr("x", 64)
    .attr("y", 58)
    .attr("class", "scene-subtitle")
    .text("Derived from historical jobs dataset and metrics profile");

  [25, 50, 75, 100].forEach((tick) => {
    layer
      .append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", (maxRadius * tick) / 100)
      .attr("class", "star-ring");
  });

  const points = metrics.map((metric, index) => {
    const angle = (Math.PI * 2 * index) / metrics.length - Math.PI / 2;
    const valueRadius = (maxRadius * metric.value) / 100;
    return {
      ...metric,
      angle,
      x: centerX + Math.cos(angle) * valueRadius,
      y: centerY + Math.sin(angle) * valueRadius,
      labelX: centerX + Math.cos(angle) * (maxRadius + 24),
      labelY: centerY + Math.sin(angle) * (maxRadius + 24)
    };
  });

  layer
    .selectAll("line.star-axis")
    .data(points)
    .join("line")
    .attr("class", "star-axis")
    .attr("x1", centerX)
    .attr("y1", centerY)
    .attr("x2", (d) => d.labelX)
    .attr("y2", (d) => d.labelY);

  layer
    .append("polygon")
    .attr(
      "points",
      points
        .map((point) => `${point.x},${point.y}`)
        .join(" ")
    )
    .attr("class", "star-area");

  layer
    .selectAll("circle.star-dot")
    .data(points)
    .join("circle")
    .attr("class", "star-dot")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", 5);

  layer
    .selectAll("text.star-label")
    .data(points)
    .join("text")
    .attr("class", "star-label")
    .attr("x", (d) => d.labelX)
    .attr("y", (d) => d.labelY)
    .attr("text-anchor", (d) => (d.labelX >= centerX ? "start" : "end"))
    .attr("alignment-baseline", "middle")
    .text((d) => `${d.label} ${d.value.toFixed(0)}`);
}

function Task1() {
  const [historyRows, setHistoryRows] = useState([]);
  const [metricRows, setMetricRows] = useState([]);
  const [worldData, setWorldData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeStep, setActiveStep] = useState(0);
  const [selectedYear, setSelectedYear] = useState(null);
  const [rotation, setRotation] = useState([-35, -16, 0]);

  const svgRef = useRef(null);
  const miniSvgRef = useRef(null);
  const stepRefs = useRef([]);
  const sceneRef = useRef(null);
  const miniSceneRef = useRef(null);
  const globeTimerRef = useRef(null);
  const isInteractingRef = useRef(false);

  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL;
    Promise.all([
      d3.csv(`${baseUrl}ai_impact_jobs_2010_2025.csv`, normalizeHistoryRow),
      d3.csv(`${baseUrl}metrics.csv`, normalizeMetricRow),
      d3.json(`${baseUrl}world-110m.json`)
    ])
      .then(([rows, metrics, world]) => {
        setHistoryRows(rows);
        setMetricRows(metrics);
        setWorldData(world);
        const firstYear = d3.min(rows, (row) => row.postingYear);
        setSelectedYear(firstYear ?? null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const years = useMemo(
    () => Array.from(new Set(historyRows.map((row) => row.postingYear))).sort((a, b) => a - b),
    [historyRows]
  );

  const regionSummary = useMemo(() => computeRegionSummary(historyRows), [historyRows]);

  const starMetrics = useMemo(
    () => computeStarMetrics(historyRows, metricRows),
    [historyRows, metricRows]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const step = Number(entry.target.getAttribute("data-step"));
            setActiveStep(step);
          }
        });
      },
      {
        threshold: 0.55,
        rootMargin: "-10% 0px -20% 0px"
      }
    );

    stepRefs.current.forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!historyRows.length || !worldData || !svgRef.current || !miniSvgRef.current) {
      return;
    }

    if (!sceneRef.current) {
      const width = 1180;
      const height = 760;
      const svg = d3
        .select(svgRef.current)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

      svg.selectAll("*").remove();

      const root = svg.append("g");
      const globeLayer = root.append("g").attr("class", "scene-layer scene-globe");
      const mapLayer = root.append("g").attr("class", "scene-layer scene-map");
      const starLayer = root.append("g").attr("class", "scene-layer scene-star");

      const globeBundle = drawGlobeScene(globeLayer, regionSummary, worldData, width, height, rotation);
      drawMapScene(mapLayer, historyRows, selectedYear, width, height);
      drawStarScene(starLayer, starMetrics, width, height);

      sceneRef.current = {
        svg,
        width,
        height,
        globeLayer,
        mapLayer,
        starLayer,
        globeBundle
      };

      // Mini Globe Controller Setup
      const miniWidth = 120;
      const miniHeight = 120;
      const miniSvg = d3
        .select(miniSvgRef.current)
        .attr("width", miniWidth)
        .attr("height", miniHeight);
      
      miniSvg.selectAll("*").remove();
      
      const miniProjection = d3
        .geoOrthographic()
        .scale(55)
        .translate([miniWidth / 2, miniHeight / 2])
        .rotate(rotation)
        .clipAngle(90);

      const miniPath = d3.geoPath(miniProjection);

      miniSvg.append("circle")
        .attr("cx", miniWidth / 2)
        .attr("cy", miniHeight / 2)
        .attr("r", 60)
        .attr("class", "mini-water");

      if (worldData) {
        miniSvg.append("path")
          .datum(topojson.feature(worldData, worldData.objects.land))
          .attr("class", "mini-land")
          .attr("d", miniPath);
      }

      const dragHandler = d3.drag()
        .on("start", () => {
          isInteractingRef.current = true;
          if (globeTimerRef.current) globeTimerRef.current.stop();
        })
        .on("drag", (event) => {
          const r = miniProjection.rotate();
          const sensitivity = 0.25;
          const nextRotation = [
            r[0] + event.dx * sensitivity,
            r[1] - event.dy * sensitivity,
            r[2]
          ];
          
          miniProjection.rotate(nextRotation);
          miniSvg.selectAll(".mini-land").attr("d", miniPath);
          
          // Sync large globe
          if (sceneRef.current && sceneRef.current.globeBundle) {
            sceneRef.current.globeBundle.redraw(nextRotation);
          }
          setRotation(nextRotation);
        })
        .on("end", () => {
          // Interaction ends, timer remains stopped unless we want to resume
        });

      miniSvg.call(dragHandler);
      miniSceneRef.current = { miniSvg, miniProjection, miniPath };
    }
  }, [historyRows, worldData, selectedYear, starMetrics, regionSummary]);

  useEffect(() => {
    if (!sceneRef.current || selectedYear === null) {
      return;
    }

    drawMapScene(
      sceneRef.current.mapLayer,
      historyRows,
      selectedYear,
      sceneRef.current.width,
      sceneRef.current.height
    );
  }, [selectedYear, historyRows]);

  useEffect(() => {
    if (!sceneRef.current || !starMetrics.length) {
      return;
    }

    drawStarScene(
      sceneRef.current.starLayer,
      starMetrics,
      sceneRef.current.width,
      sceneRef.current.height
    );
  }, [starMetrics]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    const layers = [scene.globeLayer, scene.mapLayer, scene.starLayer];
    const transition = scene.svg.transition().duration(850).ease(d3.easeCubicInOut);

    layers.forEach((layer, index) => {
      const isActive = index === activeStep;
      layer
        .style("pointer-events", isActive ? "all" : "none")
        .transition(transition)
        .style("opacity", isActive ? 1 : 0);
    });

    if (activeStep === 0 && scene.globeBundle) {
      if (globeTimerRef.current) {
        globeTimerRef.current.stop();
      }

      globeTimerRef.current = d3.timer((elapsed) => {
        const newRotation = [rotation[0] + elapsed * 0.015, rotation[1], 0];
        scene.globeBundle.redraw(newRotation);
      });
    } else if (globeTimerRef.current) {
      globeTimerRef.current.stop();
      globeTimerRef.current = null;
    }
  }, [activeStep, isLoading]);

  useEffect(() => {
    return () => {
      if (globeTimerRef.current) {
        globeTimerRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="scrolly-root">
      <div className="scrolly-glow" />

      <header className="scrolly-header">
        <p className="eyebrow">Scroll-Driven D3 Narrative</p>
        <h1>AI Job Market: Globe to Map to Star Chart</h1>
        <p>
          Scroll down and the visualization transitions scene-by-scene: regional globe, year-filtered map,
          and statistics star chart.
        </p>
      </header>

      <div className="scrolly-shell">
        <div className="viz-column">
          <div className="viz-sticky">
            <svg ref={svgRef} className="story-svg" />

            {activeStep === 1 && years.length ? (
              <div className="year-slider-wrap">
                <label htmlFor="year-slider">Year</label>
                <input
                  id="year-slider"
                  type="range"
                  min={years[0]}
                  max={years[years.length - 1]}
                  step={1}
                  value={selectedYear || years[0]}
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                />
                <div className="year-slider-meta">
                  <span>{years[0]}</span>
                  <strong>{selectedYear}</strong>
                  <span>{years[years.length - 1]}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="story-column">
          <section
            id="task-1"
            className="story-step"
            data-step="0"
            ref={(element) => {
              stepRefs.current[0] = element;
            }}
          >
            <h2>1. Globe View: Regional Footprint</h2>
            <p>
              A 3D-style orthographic globe summarizes AI intensity by region. Bubble size shows salary level,
              and color marks each region.
            </p>
          </section>

          <section
            id="task-2"
            className="story-step"
            data-step="1"
            ref={(element) => {
              stepRefs.current[1] = element;
            }}
          >
            <h2>2. 2D Map: Industry Dots by Year</h2>
            <p>
              The scene flattens to a map where each dot represents an industry-location point for the selected year.
              Fill color encodes AI intensity and dot size encodes salary.
            </p>
          </section>

          <section
            id="task-3"
            className="story-step"
            data-step="2"
            ref={(element) => {
              stepRefs.current[2] = element;
            }}
          >
            <h2>3. Star Chart: Statistics Profile</h2>
            <p>
              The final view transitions to the statistics star chart (same concept as your current plot),
              combining core dataset measures and strategic metrics.
            </p>
          </section>
          
          <section
            id="task-4"
            className="story-step"
            data-step="3"
            ref={(element) => {
              stepRefs.current[3] = element;
            }}
          >
            <h2>4. Future Predictions</h2>
            <p>
              AI Impact on Job Market in the future (Placeholder for Visualization 4).
            </p>
          </section>
        </div>
      </div>

      <div className="mini-globe-wrap" style={{ opacity: activeStep === 0 ? 1 : 0 }}>
        <div className="mini-globe-label">Drag to Rotate</div>
        <svg ref={miniSvgRef} className="mini-svg" />
      </div>

      {isLoading ? <p className="loading-text">Loading data...</p> : null}
    </div>
  );
}

export default Task1;
