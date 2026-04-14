import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import * as THREE from "three";
import "./task1.css";

const BASE_WIDTH = 1180;
const BASE_HEIGHT = 760;

const REGION_COLORS = d3
  .scaleOrdinal()
  .domain(["North America", "Europe", "East Asia", "South Asia", "Southeast Asia", "Latin America", "Middle East", "Other"])
  .range(["#FF3131", "#FF7F50", "#7DF9FF", "#FF5E00", "#FFFFFF", "#FF1493", "#E5E4E2", "#DE3163"]);

const INTENSITY_COLOR_SCALE = d3
  .scaleLinear()
  .domain([0, 0.2, 0.5, 0.8, 1.0])
  .range(["#00e5ff", "#00b0ff", "#7c4dff", "#ff00ff", "#ff006e"]);

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
  "Southeast Asia": [102, 17],
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
  Vietnam: [108.3, 14.1],
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
    lat,
  };
}

function normalizeMetricRow(row) {
  return {
    label: row.label,
    value: parseFloat(String(row.value).replace("%", "")),
  };
}

function computeCountrySummary(rows, region) {
  if (!region) return [];
  const regionRows = rows.filter((d) => d.region === region);
  return d3
    .rollups(
      regionRows,
      (values) => {
        const country = values[0].country;
        const [lon, lat] = COUNTRY_COORDS[country] || [0, 0];
        return {
          country,
          lon,
          lat,
          aiIntensity: d3.mean(values, (d) => d.aiIntensityScore) || 0,
          salary: d3.mean(values, (d) => d.salaryUsd) || 0,
          count: values.length,
        };
      },
      (d) => d.country,
    )
    .map(([_, stats]) => stats);
}

function computeRegionSummary(rows) {
  // We want to ensure ALL regions are always present in the summary, 
  // even if they have no data for a specific year, to maintain stable D3 selections.
  const allRegions = Object.keys(REGION_ANCHORS);
  
  const existingData = d3.rollups(
    rows,
    (values) => {
      const region = values[0].region;
      const [anchorLon, anchorLat] = REGION_ANCHORS[region] || [0, 0];
      
      return {
        lon: anchorLon,
        lat: anchorLat,
        aiIntensity: d3.mean(values, (d) => d.aiIntensityScore) || 0,
        salary: d3.mean(values, (d) => d.salaryUsd) || 0,
        count: values.length,
        hasData: true
      };
    },
    (d) => d.region,
  );

  const dataMap = new Map(existingData);

  return allRegions.map(region => {
    if (dataMap.has(region)) return { region, ...dataMap.get(region) };
    
    const [anchorLon, anchorLat] = REGION_ANCHORS[region];
    return {
      region,
      lon: anchorLon,
      lat: anchorLat,
      aiIntensity: 0,
      salary: 0,
      count: 0,
      hasData: false
    };
  });
}

function computeStarMetrics(rows, metricRows) {
  if (!rows.length) {
    return [];
  }

  const coreMetrics = [
    {
      label: "AI Mention",
      value: (d3.mean(rows, (d) => (d.aiMentioned ? 1 : 0)) || 0) * 100,
    },
    {
      label: "Intensity",
      value: (d3.mean(rows, (d) => d.aiIntensityScore) || 0) * 100,
    },
    {
      label: "Reskilling",
      value: (d3.mean(rows, (d) => (d.reskillingRequired ? 1 : 0)) || 0) * 100,
    },
    {
      label: "High Risk",
      value: (d3.mean(rows, (d) => (d.displacementRisk === "High" ? 1 : 0)) || 0) * 100,
    },
    {
      label: "Salary Momentum",
      value: Math.min(100, Math.max(0, (d3.mean(rows, (d) => d.salaryDeltaPct) || 0) * 4 + 50)),
    },
  ];

  const fileMetrics = metricRows
    .filter((metric) => Number.isFinite(metric.value))
    .map((metric) => ({
      label: metric.label,
      value: Math.max(0, Math.min(100, metric.value)),
    }));

  return [...coreMetrics, ...fileMetrics].slice(0, 8);
}

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = lon * (Math.PI / 180);
  
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    -radius * Math.sin(phi) * Math.sin(theta)
  );
}

function drawGlobeScene(layer, regionSummary, worldData, width, height, currentRotation, onRegionClick) {
  layer.selectAll("*").remove();

  // Add SVG Filters for Glow
  const defs = layer.append("defs");
  const filter = defs.append("filter").attr("id", "marker-glow").attr("x", "-100%").attr("y", "-100%").attr("width", "300%").attr("height", "300%");
  filter.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "blur");
  filter.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

  const globeCenterX = width / 2;
  const globeCenterY = height / 2 + 10;
  const globeScale = Math.min(width, height) * 0.45; // Shared scale factor

  const projection = d3
    .geoOrthographic()
    .scale(globeScale)
    .translate([globeCenterX, globeCenterY])
    .rotate(currentRotation)
    .clipAngle(90)
    .precision(0.3);

  const path = d3.geoPath(projection);

  // 1. Water Layer (Circle/Sphere)
  layer.append("path").datum({ type: "Sphere" }).attr("class", "globe-water").attr("d", path);

  // 2. Graticules
  layer.append("path").datum(d3.geoGraticule10()).attr("class", "globe-graticule").attr("d", path);

  // 3. Land / Countries
  if (worldData) {
    const countries = topojson.feature(worldData, worldData.objects.countries);
    layer.append("path").datum(countries).attr("class", "globe-land").attr("d", path).style("pointer-events", "none");

    layer
      .append("path")
      .datum(topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b))
      .attr("class", "globe-borders")
      .attr("d", path)
      .style("pointer-events", "none");
  }
  
  // DRAG CATCHER: An invisible circle matching the globe exactly.
  // It sits above the map paths but below the markers, ensuring the ENTIRE globe sphere is draggable.
  layer.append("circle")
    .attr("class", "globe-drag-catcher")
    .attr("cx", globeCenterX)
    .attr("cy", globeCenterY)
    .attr("r", globeScale)
    .attr("fill", "transparent")
    .attr("stroke", "transparent")
    .style("pointer-events", "all")
    .style("cursor", "grab")
    .on("mousedown", function() { d3.select(this).style("cursor", "grabbing"); })
    .on("mouseup mouseleave", function() { d3.select(this).style("cursor", "grab"); });

  // Layer for country labels
  const countryLabelsLayer = layer.append("g").attr("class", "country-labels");

  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(regionSummary, (d) => d.salary) || 100000])
    .range([0, 60]);

  const markers = layer
    .append("g")
    .attr("class", "globe-markers")
    .selectAll("g")
    .data(regionSummary)
    .join("g")
    .attr("class", "region-marker")
    .style("filter", "url(#marker-glow)")
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      if (onRegionClick) onRegionClick(d.region);
    });

  // Separate group for the surface-aligned visual symbols
  const visuals = markers.append("g").attr("class", "marker-visuals");

  // Invisible Hitbox (Large target area for easier clicking)
  markers
    .append("circle")
    .attr("class", "marker-hitbox")
    .attr("r", 60)
    .attr("fill", "none")
    .attr("stroke", "none")
    .style("pointer-events", "all");

  // Holographic Rings (inside visuals)
  visuals
    .append("circle")
    .attr("class", "ring-outer")
    .attr("r", (d) => radiusScale(d.salary) * 1.4)
    .attr("fill", "none")
    .attr("stroke", (d) => INTENSITY_COLOR_SCALE(d.aiIntensity))
    .attr("stroke-width", 2)
    .attr("stroke-opacity", 0.6);

  visuals
    .append("circle")
    .attr("class", "ring-middle")
    .attr("r", (d) => radiusScale(d.salary) * 1.0)
    .attr("fill", "none")
    .attr("stroke", (d) => INTENSITY_COLOR_SCALE(d.aiIntensity))
    .attr("stroke-width", 3)
    .attr("stroke-opacity", 0.8);

  visuals
    .append("circle")
    .attr("class", "ring-inner")
    .attr("r", (d) => radiusScale(d.salary) * 0.6)
    .attr("fill", "none")
    .attr("stroke", (d) => INTENSITY_COLOR_SCALE(d.aiIntensity))
    .attr("stroke-width", 4)
    .attr("stroke-opacity", 1);

  // Central Beacon (inside visuals)
  visuals
    .append("circle")
    .attr("class", "beacon-dot")
    .attr("r", 6)
    .attr("fill", "#fff")
    .attr("fill-opacity", 1);

  // Main label (stays upright)
  markers
    .append("text")
    .attr("class", "region-label")
    .attr("y", (d) => -radiusScale(d.salary) - 24)
    .attr("text-anchor", "middle")
    .attr("fill", "#fff")
    .style("filter", "none") /* Text shouldn't glow too much or it blurs */
    .style("font-size", "18px")
    .style("font-weight", "800")
    .style("text-shadow", "0 2px 8px rgba(0,0,0,1)")
    .text((d) => d.region);

  let trackedZoom = 1;
  let trackedRotation = currentRotation;

  let labelNodes = [];
  const labelForce = d3.forceSimulation(labelNodes)
    .force("collide", d3.forceCollide().radius(25).iterations(2)) 
    .force("x", d3.forceX().x(d => d.targetX).strength(0.4))
    .force("y", d3.forceY().y(d => d.targetY).strength(0.4))
    .stop();

  const redraw = (newRot, zoom = null) => {
    if (newRot) trackedRotation = newRot;
    if (zoom !== null) trackedZoom = zoom;
    
    const zoomedScale = globeScale * trackedZoom;
    projection.scale(zoomedScale).rotate(trackedRotation);
    const center = [-trackedRotation[0], -trackedRotation[1]];

    layer.selectAll(".globe-water").attr("d", path);
    layer.selectAll(".globe-graticule").attr("d", path);
    layer.selectAll(".globe-land").attr("d", path);
    layer.selectAll(".globe-borders").attr("d", path);

    layer.selectAll(".globe-drag-catcher").attr("r", zoomedScale);

    markers
      .each(function (d) {
        const coord = [d.lon, d.lat];
        const dist = d3.geoDistance(coord, center);
        const point = projection(coord);
        
        const selection = d3.select(this);
        
        const isHiddenByZoom = trackedZoom > 1.5;

        // Ensure variables define the current visibility state safely:
        if (!point || dist > Math.PI / 2 || !d.hasData || isHiddenByZoom) {
          selection.style("opacity", 0).attr("transform", "translate(-9999, -9999)");
          return;
        }

        const fadeThreshold = Math.PI / 2 - 0.25;
        const opacity = dist < fadeThreshold ? 1 : Math.max(0, 1 - (dist - fadeThreshold) / 0.25);
        
        const f = Math.cos(dist);
        const angle = Math.atan2(point[1] - globeCenterY, point[0] - globeCenterX) * (180 / Math.PI);

        selection
          .style("opacity", opacity)
          .attr("transform", `translate(${point[0]}, ${point[1]})`);

        selection.select(".marker-visuals")
          .attr("transform", `rotate(${angle}) scale(${f}, 1)`);
      });
      
    // Redraw country labels with collision detection & layout
    const activeNodes = [];
    countryLabelsLayer.selectAll(".country-label-group")
      .each(function (d) {
        const node = labelNodes.find(n => n.country === d.country);
        if (!node) return;
        
        const coord = [d.lon, d.lat];
        const dist = d3.geoDistance(coord, center);
        const point = projection(coord);
        
        if (!point || dist > Math.PI / 2 - 0.1 || trackedZoom <= 1.5) {
          node.visible = false;
          d3.select(this).style("opacity", 0).attr("transform", "translate(-9999, -9999)");
          return;
        }
        
        // Estímate 3D bar height to project the tip
        const maxSalary = d3.max(labelNodes, n => n.salary) || 100000;
        const height3D = (d.salary / maxSalary) * 150 + 25; 
        
        // Outward radial vector mapped from sphere center
        let dx = point[0] - globeCenterX;
        let dy = point[1] - globeCenterY;
        const radius2D = Math.hypot(dx, dy) || 1;
        dx /= radius2D;
        dy /= radius2D;
        
        // Tighter tracking: Project tip based on map perspective offset 
        const tipOffset = height3D * trackedZoom * Math.sin(dist);
        const tipX = point[0] + dx * tipOffset;
        const tipY = point[1] + dy * tipOffset;
        
        // Define exact line anchor (tip of bar)
        node.anchorX = tipX;
        node.anchorY = tipY;
        
        // Text floating target
        node.targetX = tipX + dx * 20;
        node.targetY = tipY + dy * 20; 
        node.visible = true;
        
        // Initial placement bootstrap
        if (!node.x && !node.y) {
           node.x = node.targetX;
           node.y = node.targetY;
        }
        
        activeNodes.push(node);
      });
      
    if (activeNodes.length > 0) {
      labelForce.nodes(activeNodes);
      labelForce.alpha(0.3).tick(); // lightweight physics solving per frame
      
      countryLabelsLayer.selectAll(".country-label-group")
        .each(function(d) {
          const node = activeNodes.find(n => n.country === d.country);
          if(!node || !node.visible) return;
          
          const sel = d3.select(this);
          sel.style("opacity", 1)
             .attr("transform", `translate(${node.x}, ${node.y})`);
             
          // Stretch arrow dynamically using path
          sel.select(".leader-line")
             .attr("d", `M 0,0 L ${node.anchorX - node.x}, ${node.anchorY - node.y}`);
             
          const isRight = node.targetX > node.anchorX;
          sel.selectAll("text")
             .attr("text-anchor", isRight ? "start" : "end")
             .attr("dx", isRight ? 6 : -6);
        });
    }
  };

  const update = (newSummary) => {
    const rScale = d3
      .scaleSqrt()
      .domain([0, d3.max(newSummary, d => d.salary) || 100000])
      .range([0, 60]);

    const transition = d3.transition().duration(800).ease(d3.easeCubicInOut);

    markers.data(newSummary, d => d.region)
      .each(function(d) {
        const sel = d3.select(this);
        
        sel.select(".ring-outer")
          .transition(transition)
          .attr("r", rScale(d.salary) * 1.4)
          .attr("stroke", INTENSITY_COLOR_SCALE(d.aiIntensity));

        sel.select(".ring-middle")
          .transition(transition)
          .attr("r", rScale(d.salary) * 1.0)
          .attr("stroke", INTENSITY_COLOR_SCALE(d.aiIntensity));

        sel.select(".ring-inner")
          .transition(transition)
          .attr("r", rScale(d.salary) * 0.6)
          .attr("stroke", INTENSITY_COLOR_SCALE(d.aiIntensity));

        sel.select(".region-label")
          .transition(transition)
          .attr("y", -rScale(d.salary) - 24);
      });
  };

  const updateCountryLabels = (cSummary) => {
    // Render labels only when zooming in with an active physics layout
    const maxSalary = d3.max(cSummary, d => d.salary) || 100000;
    
    // Seed new simulation nodes starting near center
    labelNodes = cSummary.map(d => ({ ...d, x: globeCenterX, y: globeCenterY }));
    countryLabelsLayer.selectAll(".country-label-group").remove();
    
    if (cSummary.length === 0) {
      labelForce.nodes([]);
      return;
    }
    
    const labels = countryLabelsLayer.selectAll(".country-label-group")
      .data(labelNodes, d => d.country)
      .join("g")
      .attr("class", "country-label-group")
      .style("opacity", 0);
      
    // The Line joining text to the bar top
    labels.append("path")
      .attr("class", "leader-line")
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.7)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "2 3");
      
    // Text background glow
    labels.append("text")
      .attr("class", "marker-glow-bg")
      .attr("y", 4)
      .attr("stroke", "rgba(0,0,0,0.8)")
      .attr("stroke-width", 4)
      .attr("stroke-linejoin", "round")
      .style("font-size", "14px")
      .style("font-weight", 700)
      .style("cursor", "default")
      .text(d => `${d.country} ($${d3.format(",.0f")(d.salary)})`);

    // Foreground text
    labels.append("text")
      .attr("y", 4)
      .attr("fill", "#fff")
      .style("font-size", "14px")
      .style("font-weight", 700)
      .style("cursor", "default")
      .text(d => `${d.country} ($${d3.format(",.0f")(d.salary)})`);

    // Fade labels in
    labels.transition().duration(300).style("opacity", 1);
    
    // Automatically tick the layout for a short burst to ensure they spread immediately
    let layoutTicks = 0;
    const settleTimer = d3.timer(() => {
       redraw(null, null);
       layoutTicks++;
       if (layoutTicks > 40) settleTimer.stop();
    });
  };

  return { redraw, update, updateCountryLabels };
}

function drawMapScene(layer, rows, worldData, selectedYear, width, height) {
  layer.selectAll("*").remove();

  const projection = d3.geoEqualEarth().fitExtent(
    [
      [52, 58],
      [width - 52, height - 130],
    ],
    { type: "Sphere" },
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
        count: values.length,
      }),
      (d) => `${d.country}__${d.industry}`,
    )
    .map(([key, stats]) => ({ key, ...stats }));

  const radiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(grouped, (d) => d.salary))
    .range([3, 14]);

  const intensityScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0.02, 0.95]);

  layer.append("path").datum({ type: "Sphere" }).attr("class", "map-sphere").attr("d", path);

  if (worldData && worldData.objects) {
    layer
      .append("path")
      .datum(topojson.feature(worldData, worldData.objects.countries))
      .attr("class", "map-land")
      .attr("d", path);
  }

  layer.append("path").datum(d3.geoGraticule10()).attr("class", "map-graticule").attr("d", path);

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

  dots
    .append("title")
    .text(
      (d) =>
        `${d.industry} in ${d.country}\nAI intensity: ${(d.aiIntensity * 100).toFixed(1)}%\nSalary: $${d3.format(
          ",.0f",
        )(d.salary)}\nSamples: ${d.count}`,
    );
}

function drawStarScene(layer, metrics, width, height) {
  layer.selectAll("*").remove();

  const centerX = width / 2;
  const centerY = height / 2 + 10;
  const maxRadius = Math.min(width, height) * 0.24;

  layer.append("text").attr("x", 64).attr("y", 38).attr("class", "scene-title").text("AI Impact Statistics Star Chart");

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
      labelY: centerY + Math.sin(angle) * (maxRadius + 24),
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
    .attr("points", points.map((point) => `${point.x},${point.y}`).join(" "))
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
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [isZooming, setIsZooming] = useState(false);
  const rotationRef = useRef(rotation);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  const svgRef = useRef(null);
  const threeContainerRef = useRef(null);
  const miniSvgRef = useRef(null);
  const stepRefs = useRef([]);
  const sceneRef = useRef(null);
  const threeSceneRef = useRef(null);
  const miniSceneRef = useRef(null);
  const globeTimerRef = useRef(null);
  const isInteractingRef = useRef(false);

  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL;
    Promise.all([
      d3.csv(`${baseUrl}ai_impact_jobs_2010_2025.csv`, normalizeHistoryRow),
      d3.csv(`${baseUrl}metrics.csv`, normalizeMetricRow),
      d3.json(`${baseUrl}world-110m.json`),
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
    [historyRows],
  );

  const regionSummary = useMemo(() => {
    const yearRows = selectedYear 
      ? historyRows.filter(r => r.postingYear === selectedYear)
      : historyRows;
    return computeRegionSummary(yearRows);
  }, [historyRows, selectedYear]);

  const countrySummary = useMemo(() => {
    const yearRows = selectedYear ? historyRows.filter((r) => r.postingYear === selectedYear) : historyRows;
    return computeCountrySummary(yearRows, selectedRegion);
  }, [historyRows, selectedYear, selectedRegion]);

  const starMetrics = useMemo(() => computeStarMetrics(historyRows, metricRows), [historyRows, metricRows]);

  const resetView = () => {
    const startRotation = [...rotation];
    const endRotation = [-15, -10, 0]; // Nice overview angle
    const startZoom = selectedRegion ? 2.2 : 1;
    
    setSelectedRegion(null);
    setIsZooming(false);

    const interpolator = d3.interpolate(startRotation, endRotation);
    const zoomInterpolator = d3.interpolate(startZoom, 1);

    const transitionDuration = 1000;
    const timer = d3.timer((elapsed) => {
      const t = Math.min(1, elapsed / transitionDuration);
      const easedT = d3.easeCubicInOut(t);
      
      const currentRot = interpolator(easedT);
      const currentZoom = zoomInterpolator(easedT);

      setRotation(currentRot);
      if (sceneRef.current && sceneRef.current.globeBundle) {
        sceneRef.current.globeBundle.redraw(currentRot, currentZoom);
      }
      
      if (threeSceneRef.current) {
        const { globe, renderer, scene: tScene, camera, group } = threeSceneRef.current;
        group.rotation.y = currentRot[0] * (Math.PI / 180) - Math.PI / 2;
        group.rotation.x = -currentRot[1] * (Math.PI / 180);
        group.scale.set(currentZoom, currentZoom, currentZoom);
        renderer.render(tScene, camera);
      }

      if (t === 1) timer.stop();
    });
  };

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
        rootMargin: "-10% 0px -20% 0px",
      },
    );

    stepRefs.current.forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!threeSceneRef.current || !selectedRegion) {
       if (threeSceneRef.current && threeSceneRef.current.barsGroup) {
         threeSceneRef.current.barsGroup.clear();
       }
       return;
    }

    const { barsGroup, renderer, scene: tScene, camera } = threeSceneRef.current;
    barsGroup.clear();

    const commonScale = Math.min(BASE_WIDTH, BASE_HEIGHT) * 0.45;
    const maxSalary = d3.max(countrySummary, d => d.salary) || 100000;

    countrySummary.forEach(d => {
      const height = (d.salary / maxSalary) * 150 + 25; // Significant height for clear visibility
      const geometry = new THREE.BoxGeometry(6, 1, 6); // More substantial base
      // Shift origin to bottom
      geometry.translate(0, 0.5, 0); 
      
      const material = new THREE.MeshStandardMaterial({
        color: INTENSITY_COLOR_SCALE(d.aiIntensity),
        transparent: true,
        opacity: 0.9,
        emissive: INTENSITY_COLOR_SCALE(d.aiIntensity),
        emissiveIntensity: 0.5
      });

      const mesh = new THREE.Mesh(geometry, material);
      const pos = latLonToVector3(d.lat, d.lon, commonScale);
      mesh.position.copy(pos);
      
      // Orient bar to point precisely outward from the sphere center
      const normal = pos.clone().normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      
      mesh.scale.set(1, 0.01, 1);
      barsGroup.add(mesh);

      // Animate growth
      const duration = 1200;
      const delay = Math.random() * 500;
      const start = Date.now() + delay;

      const animateGrowth = () => {
        const now = Date.now();
        if (now < start) {
          requestAnimationFrame(animateGrowth);
          return;
        }
        
        const elapsed = now - start;
        const t = Math.min(1, elapsed / duration);
        const easedT = d3.easeElasticOut(t, 1, 0.5);
        
        mesh.scale.set(1, height * easedT, 1);
        
        if (t < 1) {
          requestAnimationFrame(animateGrowth);
        }
      };
      animateGrowth();
    });

    // Final render
    const frame = () => {
       renderer.render(tScene, camera);
       if (selectedRegion) requestAnimationFrame(frame);
    };
    frame();

  }, [selectedRegion, countrySummary]);

  useEffect(() => {
    if (!historyRows.length || !worldData || !svgRef.current || !miniSvgRef.current) {
      return;
    }

    if (!sceneRef.current) {
      const svg = d3
        .select(svgRef.current)
        .attr("viewBox", `0 0 ${BASE_WIDTH} ${BASE_HEIGHT}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

      svg.selectAll("*").remove();

      const root = svg.append("g");
      const globeLayer = root.append("g").attr("class", "scene-layer scene-globe");
      const mapLayer = root.append("g").attr("class", "scene-layer scene-map");
      const starLayer = root.append("g").attr("class", "scene-layer scene-star");

      const onRegionClick = (region) => {
        const anchor = REGION_ANCHORS[region];
        if (!anchor) return;

        // Cinematic transition: Rotate to anchor and zoom
        const startRotation = [...rotationRef.current];
        const endRotation = [-anchor[0], -anchor[1], 0];
        
        setSelectedRegion(region);
        setIsZooming(true);

        const interpolator = d3.interpolate(startRotation, endRotation);
        const zoomInterpolator = d3.interpolate(1, 2.2);

        const transitionDuration = 1000;
        const timer = d3.timer((elapsed) => {
          const t = Math.min(1, elapsed / transitionDuration);
          const easedT = d3.easeCubicInOut(t);
          
          const currentRot = interpolator(easedT);
          const currentZoom = zoomInterpolator(easedT);

          // Sync large globe directly via DOM/D3 bundle to avoid React re-render lag
          if (sceneRef.current && sceneRef.current.globeBundle) {
            sceneRef.current.globeBundle.redraw(currentRot, currentZoom);
          }
          
          // Sync Three.js directly
          if (threeSceneRef.current) {
            const { renderer, scene: tScene, camera, group } = threeSceneRef.current;
            // Standard alignment offset: -PI/2
            group.rotation.y = currentRot[0] * (Math.PI / 180) - Math.PI / 2;
            group.rotation.x = -currentRot[1] * (Math.PI / 180);
            group.scale.set(currentZoom, currentZoom, currentZoom);
            renderer.render(tScene, camera);
          }

          if (t === 1) {
            setRotation(currentRot); // Final sync to React state
            timer.stop();
          }
        });
      };

      const globeBundle = drawGlobeScene(globeLayer, regionSummary, worldData, BASE_WIDTH, BASE_HEIGHT, rotation, onRegionClick);
      drawMapScene(mapLayer, historyRows, worldData, selectedYear, BASE_WIDTH, BASE_HEIGHT);
      drawStarScene(starLayer, starMetrics, BASE_WIDTH, BASE_HEIGHT);

      sceneRef.current = {
        svg,
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
        globeLayer,
        mapLayer,
        starLayer,
        globeBundle,
      };

      // Three.js Photorealistic Globe Setup
      if (threeContainerRef.current) {
        // Clear previous renderer if any
        threeContainerRef.current.innerHTML = "";

        const scene = new THREE.Scene();
        // Orthographic Camera is essential for 1:1 D3-ThreeJS alignment
        // Initial setup with base dimensions; will be updated by ResizeObserver
        const camera = new THREE.OrthographicCamera(
          -BASE_WIDTH / 2,
          BASE_WIDTH / 2,
          BASE_HEIGHT / 2,
          -BASE_HEIGHT / 2,
          0.1,
          2000,
        );
        camera.position.z = 1000;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(BASE_WIDTH, BASE_HEIGHT);
        threeContainerRef.current.appendChild(renderer.domElement);

        const group = new THREE.Group();
        // Shift group by 10px down to match D3 translate Y-offset
        group.position.y = -10;
        scene.add(group);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
        dirLight.position.set(5, 3, 5);
        scene.add(dirLight);

        const loader = new THREE.TextureLoader();
        // Standard Detail Satellite Texture
        const texture = loader.load(
          "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
        );
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        // Radius MUST match globeScale exactly
        const commonScale = Math.min(BASE_WIDTH, BASE_HEIGHT) * 0.45;
        const geometry = new THREE.SphereGeometry(commonScale, 128, 128);
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 1,
        });
        const globe = new THREE.Mesh(geometry, material);
        // Globe mesh itself stays at identity; Group handles the -90deg starting offset
        group.add(globe);

        const barsGroup = new THREE.Group();
        group.add(barsGroup);

        threeSceneRef.current = { scene, camera, renderer, globe, group, barsGroup };

        // Handle Resize for Three.js Alignment
        const handleResize = () => {
          if (!threeContainerRef.current || !threeSceneRef.current) return;

          const container = threeContainerRef.current;
          const rect = container.getBoundingClientRect();
          const domWidth = rect.width;
          const domHeight = rect.height;

          if (domWidth === 0 || domHeight === 0) return;

          const aspect = BASE_WIDTH / BASE_HEIGHT;
          const domAspect = domWidth / domHeight;

          let viewWidth, viewHeight;
          if (domAspect > aspect) {
            // Wider than base aspect: height is the constraint (matches SVG "meet" logic)
            viewHeight = BASE_HEIGHT;
            viewWidth = BASE_HEIGHT * domAspect;
          } else {
            // Taller than base aspect: width is the constraint
            viewWidth = BASE_WIDTH;
            viewHeight = BASE_WIDTH / domAspect;
          }

          const { camera: tCamera, renderer: tRenderer } = threeSceneRef.current;
          tCamera.left = -viewWidth / 2;
          tCamera.right = viewWidth / 2;
          tCamera.top = viewHeight / 2;
          tCamera.bottom = -viewHeight / 2;
          tCamera.updateProjectionMatrix();

          tRenderer.setSize(domWidth, domHeight);
          tRenderer.setPixelRatio(window.devicePixelRatio);
          tRenderer.render(scene, tCamera);
        };

        const resizeObserver = new ResizeObserver(() => {
          handleResize();
        });

        resizeObserver.observe(threeContainerRef.current);
        handleResize(); // Initial call

        // Clean up observer if needed (though it's in a one-time init block)
        threeSceneRef.current.resizeObserver = resizeObserver;
      }

      // Mini Globe Controller Setup
      const miniWidth = 120;
      const miniHeight = 120;
      const miniSvg = d3.select(miniSvgRef.current).attr("width", miniWidth).attr("height", miniHeight);

      miniSvg.selectAll("*").remove();

      const miniProjection = d3
        .geoOrthographic()
        .scale(55)
        .translate([miniWidth / 2, miniHeight / 2])
        .rotate(rotation)
        .clipAngle(90);

      const miniPath = d3.geoPath(miniProjection);

      miniSvg
        .append("circle")
        .attr("cx", miniWidth / 2)
        .attr("cy", miniHeight / 2)
        .attr("r", 60)
        .attr("class", "mini-water");

      if (worldData) {
        miniSvg
          .append("path")
          .datum(topojson.feature(worldData, worldData.objects.land))
          .attr("class", "mini-land")
          .attr("d", miniPath);
      }

      const dragHandler = d3
        .drag()
        .on("start", (event) => {
          isInteractingRef.current = true;
          if (globeTimerRef.current) globeTimerRef.current.stop();
          
          // Determine if drag started on the mini globe or big globe
          const isMini = !!event.sourceEvent.target.closest('svg[width="120"]');
          
          // Only zoom out and reset region if dragging the mini globe
          if (isMini) {
            setSelectedRegion(null);
            setIsZooming(false);
          }
        })
        .on("drag", (event) => {
          const r = miniProjection.rotate();
          const sensitivity = 0.25;
          const nextRotation = [r[0] + event.dx * sensitivity, r[1] - event.dy * sensitivity, r[2]];

          miniProjection.rotate(nextRotation);
          miniSvg.selectAll(".mini-land").attr("d", miniPath);

          // Determine current zoom state
          // Use 1.0 for mini globe drags, otherwise preserve the current scale of the 3D globe map
          const isMini = !!event.sourceEvent.target.closest('svg[width="120"]');
          const activeZoom = isMini ? 1.0 : (threeSceneRef.current ? threeSceneRef.current.group.scale.x : 1.0);

          if (sceneRef.current && sceneRef.current.globeBundle) {
            sceneRef.current.globeBundle.redraw(nextRotation, activeZoom);
          }

          // Sync Three.js rotation and scale
          if (threeSceneRef.current) {
            const { renderer, scene: tScene, camera, group } = threeSceneRef.current;
            // Standard alignment offset: -PI/2
            group.rotation.y = nextRotation[0] * (Math.PI / 180) - Math.PI / 2;
            group.rotation.x = -nextRotation[1] * (Math.PI / 180);
            group.scale.set(activeZoom, activeZoom, activeZoom);
            renderer.render(tScene, camera);
          }

          setRotation(nextRotation);
        })
        .on("end", () => {
          // Permanently disable auto-rotation after user takes control
          isInteractingRef.current = true;
        });

      miniSvg.call(dragHandler);
      
      // Allow dragging directly on the main globe SVG
      svg.call(dragHandler);

      miniSceneRef.current = { miniSvg, miniProjection, miniPath };
    }
  }, [historyRows, worldData, selectedYear, starMetrics, regionSummary]);

  useEffect(() => {
    if (!sceneRef.current || selectedYear === null) {
      return;
    }

    // Update 3D Globe data
    if (sceneRef.current.globeBundle) {
      sceneRef.current.globeBundle.update(regionSummary);
      sceneRef.current.globeBundle.updateCountryLabels(countrySummary);
    }

    // Update 2D Map data
    drawMapScene(
      sceneRef.current.mapLayer,
      historyRows,
      worldData,
      selectedYear,
      sceneRef.current.width,
      sceneRef.current.height,
    );
  }, [selectedYear, historyRows, worldData, regionSummary, countrySummary]);

  useEffect(() => {
    if (!sceneRef.current || !starMetrics.length) {
      return;
    }

    drawStarScene(sceneRef.current.starLayer, starMetrics, sceneRef.current.width, sceneRef.current.height);
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

    if (activeStep === 0 && scene.globeBundle && !isInteractingRef.current) {
      if (globeTimerRef.current) {
        globeTimerRef.current.stop();
      }

      globeTimerRef.current = d3.timer((elapsed) => {
        if (isInteractingRef.current) {
          globeTimerRef.current.stop();
          return;
        }

        const newRotation = [rotation[0] + elapsed * 0.015, rotation[1], 0];
        scene.globeBundle.redraw(newRotation);

        // Sync Three.js rotation
        if (threeSceneRef.current) {
          const { renderer, scene: tScene, camera, group } = threeSceneRef.current;
          // Standard alignment offset: -PI/2
          group.rotation.y = newRotation[0] * (Math.PI / 180) - Math.PI / 2;
          group.rotation.x = -newRotation[1] * (Math.PI / 180);
          renderer.render(tScene, camera);
        }
      });
    } else if (globeTimerRef.current) {
      globeTimerRef.current.stop();
      globeTimerRef.current = null;
    }
  }, [activeStep, isLoading, rotation]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { globeLayer, mapLayer, starLayer } = sceneRef.current;
    
    // Dynamically manage interactivity based on the active narrative step
    if (activeStep === 0) {
      globeLayer.style("pointer-events", "auto").style("opacity", 1);
      mapLayer.style("pointer-events", "none").style("opacity", 0);
      starLayer.style("pointer-events", "none").style("opacity", 0);
    } else if (activeStep === 1) {
      globeLayer.style("pointer-events", "none").style("opacity", 0);
      mapLayer.style("pointer-events", "auto").style("opacity", 1);
      starLayer.style("pointer-events", "none").style("opacity", 0);
    } else if (activeStep === 2) {
      globeLayer.style("pointer-events", "none").style("opacity", 0);
      mapLayer.style("pointer-events", "none").style("opacity", 0);
      starLayer.style("pointer-events", "auto").style("opacity", 1);
    }
  }, [activeStep]);

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
          Scroll down and the visualization transitions scene-by-scene: regional globe, year-filtered map, and
          statistics star chart.
        </p>
      </header>

      <div className="scrolly-shell">
        <div className="viz-column">
          <div className="viz-sticky">
            <div
              className="three-globe-container"
              ref={threeContainerRef}
              style={{
                opacity: activeStep === 0 ? 1 : 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            />
            <svg ref={svgRef} className="story-svg" />

            {selectedRegion && (
              <div className="drilldown-controls">
                <button className="back-btn" onClick={resetView}>
                  <span className="icon">←</span> Back to Global View
                </button>
                <div className="drilldown-title">
                  <span className="region-indicator">Region Explored</span>
                  <h3>{selectedRegion}</h3>
                  <p>3D bars represent individual country data for {selectedYear}</p>
                </div>
              </div>
            )}

            { (activeStep === 0 || activeStep === 1) && years.length ? (
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
                  <input
                    type="number"
                    className="year-input"
                    value={selectedYear || ""}
                    min={years[0]}
                    max={years[years.length - 1]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) setSelectedYear(val);
                    }}
                  />
                  <span>{years[years.length - 1]}</span>
                </div>
              </div>
            ) : null}

            {activeStep === 0 && (
              <div className="viz-legend">
                <div className="legend-section">
                  <h4>AI Intensity Score</h4>
                  <div className="intensity-ramp"></div>
                  <div className="legend-labels">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
                <div className="legend-divider"></div>
                <div className="legend-section">
                  <h4>Avg Salary (USD)</h4>
                  <div className="salary-circles">
                    <div className="salary-circle s1"></div>
                    <div className="salary-circle s2"></div>
                    <div className="salary-circle s3"></div>
                  </div>
                  <div className="legend-labels">
                    <span>Larger = Higher</span>
                  </div>
                </div>
              </div>
            )}
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
              A 3D-style orthographic globe summarizes AI intensity by region. Bubble size shows salary level, and color
              marks each region.
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
              The final view transitions to the statistics star chart (same concept as your current plot), combining
              core dataset measures and strategic metrics.
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
            <p>AI Impact on Job Market in the future (Placeholder for Visualization 4).</p>
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
