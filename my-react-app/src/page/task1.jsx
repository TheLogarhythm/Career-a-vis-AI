import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import * as THREE from "three";
import "./task1.css";

const BASE_WIDTH = 900;
const BASE_HEIGHT = 700;

const REGION_COLORS = d3
  .scaleOrdinal()
  .domain(["North America", "Europe", "East Asia", "South Asia", "Southeast Asia", "Latin America", "Middle East", "Other"])
  .range(["#FF3131", "#FF7F50", "#7DF9FF", "#FF5E00", "#FFFFFF", "#FF1493", "#E5E4E2", "#DE3163"]);

const INTENSITY_COLOR_SCALE = d3
  .scaleLinear()
  .domain([0, 0.2, 0.5, 0.8, 1.0])
  .range(["#00e5ff", "#00b0ff", "#7c4dff", "#ff00ff", "#ff006e"]);

const REGION_ANCHORS = {
  Africa: [20, 6], "East Asia": [115, 30], Europe: [12, 52],
  "Middle East": [45, 30], "North America": [-100, 40], Oceania: [140, -25],
  "South America": [-60, -15], "South Asia": [78, 20], "Southeast Asia": [102, 17],
};

const COUNTRY_COORDS = {
  Argentina: [-63.6, -38.4], Australia: [133.8, -25.3], Bangladesh: [90.3, 23.7],
  Brazil: [-51.9, -14.2], Canada: [-106.3, 56.1], Chile: [-71.5, -35.7],
  China: [104.2, 35.9], Colombia: [-74.1, 4.6], Egypt: [30.8, 26.8],
  France: [2.2, 46.2], Germany: [10.4, 51.2], Ghana: [-1.0, 7.9],
  India: [78.9, 21.0], Indonesia: [113.9, -0.8], Israel: [34.8, 31.0],
  Italy: [12.6, 41.9], Japan: [138.3, 36.2], Jordan: [36.2, 31.2],
  Kenya: [37.9, 0.0], Malaysia: [102.0, 4.2], Mexico: [-102.5, 23.6],
  Morocco: [-7.1, 31.8], Nepal: [84.1, 28.4], Netherlands: [5.3, 52.1],
  "New Zealand": [174.9, -40.9], Nigeria: [8.7, 9.1], Pakistan: [69.3, 30.4],
  Peru: [-75.0, -9.2], Philippines: [121.8, 12.8], Poland: [19.1, 51.9],
  Qatar: [51.2, 25.3], "Saudi Arabia": [45.1, 23.9], Singapore: [103.8, 1.35],
  "South Africa": [24.9, -30.6], "South Korea": [127.8, 36.5], Spain: [-3.7, 40.4],
  "Sri Lanka": [80.7, 7.9], Sweden: [18.6, 60.1], Taiwan: [121.0, 23.7],
  Thailand: [100.99, 15.9], UAE: [54.4, 24.4], "United Kingdom": [-3.4, 55.4],
  "United States": [-98.6, 39.8], Vietnam: [108.3, 14.1],
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
  if (COUNTRY_COORDS[country]) return COUNTRY_COORDS[country];
  const [baseLon, baseLat] = REGION_ANCHORS[region] || [0, 0];
  const seed = hashString(country);
  return [baseLon + (seed % 24) - 12, baseLat + (Math.floor(seed / 24) % 14) - 7];
}

function normalizeHistoryRow(row) {
  const [lon, lat] = resolveCoordinates(row.country, row.region);
  return {
    postingYear: +row.posting_year, country: row.country, region: row.region,
    industry: row.industry, aiIntensityScore: +row.ai_intensity_score,
    salaryUsd: +row.salary_usd, automationRiskScore: +row.automation_risk_score, lon, lat,
  };
}

function computeRegionSummary(rows) {
  const allRegions = Object.keys(REGION_ANCHORS);
  const existingData = d3.rollups(
    rows,
    (values) => {
      const region = values[0].region;
      const [anchorLon, anchorLat] = REGION_ANCHORS[region] || [0, 0];
      return { lon: anchorLon, lat: anchorLat, aiIntensity: d3.mean(values, d => d.aiIntensityScore) || 0, salary: d3.mean(values, d => d.salaryUsd) || 0, count: values.length, hasData: true };
    },
    d => d.region,
  );
  const dataMap = new Map(existingData);
  return allRegions.map(region => {
    if (dataMap.has(region)) return { region, ...dataMap.get(region) };
    const [anchorLon, anchorLat] = REGION_ANCHORS[region];
    return { region, lon: anchorLon, lat: anchorLat, aiIntensity: 0, salary: 0, count: 0, hasData: false };
  });
}

function computeCountrySummary(rows, region) {
  if (!region) return [];
  const regionRows = rows.filter(d => d.region === region);
  return d3.rollups(
    regionRows,
    (values) => {
      const country = values[0].country;
      const [lon, lat] = COUNTRY_COORDS[country] || [0, 0];
      return { country, lon, lat, aiIntensity: d3.mean(values, d => d.aiIntensityScore) || 0, salary: d3.mean(values, d => d.salaryUsd) || 0, count: values.length };
    },
    d => d.country,
  ).map(([, stats]) => stats);
}

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = lon * (Math.PI / 180);
  return new THREE.Vector3(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), -radius * Math.sin(phi) * Math.sin(theta));
}

function drawGlobeScene(layer, regionSummary, worldData, width, height, currentRotation, onRegionClick) {
  layer.selectAll("*").remove();

  const defs = layer.append("defs");
  const filter = defs.append("filter").attr("id", "marker-glow").attr("x", "-100%").attr("y", "-100%").attr("width", "300%").attr("height", "300%");
  filter.append("feGaussianBlur").attr("stdDeviation", "6").attr("result", "blur");
  filter.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

  const globeCenterX = width / 2;
  const globeCenterY = height / 2 + 10;
  const globeScale = Math.min(width, height) * 0.45;

  const projection = d3.geoOrthographic()
    .scale(globeScale).translate([globeCenterX, globeCenterY]).rotate(currentRotation).clipAngle(90).precision(0.3);
  const path = d3.geoPath(projection);

  // Water (ocean)
  layer.append("path").datum({ type: "Sphere" }).attr("class", "globe-water").attr("d", path);
  // Graticule
  layer.append("path").datum(d3.geoGraticule10()).attr("class", "globe-graticule").attr("d", path);
  // Land
  if (worldData) {
    const countries = topojson.feature(worldData, worldData.objects.countries);
    layer.append("path").datum(countries).attr("class", "globe-land").attr("d", path).style("pointer-events", "none");
    layer.append("path")
      .datum(topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b))
      .attr("class", "globe-borders").attr("d", path).style("pointer-events", "none");
  }

  // Invisible drag catcher
  layer.append("circle")
    .attr("class", "globe-drag-catcher")
    .attr("cx", globeCenterX).attr("cy", globeCenterY).attr("r", globeScale)
    .attr("fill", "transparent").attr("stroke", "transparent")
    .style("pointer-events", "all").style("cursor", "grab");

  const countryLabelsLayer = layer.append("g").attr("class", "country-labels");

  const sizeScale = d3.scaleSqrt().domain([0, d3.max(regionSummary, d => d.salary) || 100000]).range([8, 28]);
  const markers = layer.selectAll(".region-marker")
    .data(regionSummary.filter(d => d.hasData), d => d.region)
    .join("g").attr("class", "region-marker");

  markers.each(function(d) {
    const g = d3.select(this);
    g.selectAll("*").remove();
    const pos = projection([d.lon, d.lat]);
    if (!pos) return;
    const [cx, cy] = pos;
    const r = sizeScale(d.salary);
    // Glow
    g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", r + 6)
      .attr("fill", INTENSITY_COLOR_SCALE(d.aiIntensity)).attr("opacity", 0.18).attr("filter", "url(#marker-glow)");
    // Main bubble
    g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", r)
      .attr("fill", INTENSITY_COLOR_SCALE(d.aiIntensity)).attr("opacity", 0.7).attr("stroke", "#fff").attr("stroke-width", 1.5);
    // Label
    g.append("text").attr("x", cx).attr("y", cy - r - 8)
      .attr("text-anchor", "middle").attr("fill", "#ffffff").attr("font-size", "11px").attr("font-weight", "600")
      .attr("paint-order", "stroke").attr("stroke", "rgba(0,0,0,0.5)").attr("stroke-width", 3)
      .text(d.region);
  });

  markers.style("cursor", "pointer").on("click", (e, d) => onRegionClick(d.region));

  const redraw = (rot, zoom = 1) => {
    projection.rotate(rot).scale(globeScale * zoom);
    layer.selectAll(".globe-water").attr("d", path);
    layer.selectAll(".globe-graticule").attr("d", path);
    layer.selectAll(".globe-land").attr("d", path);
    layer.selectAll(".globe-borders").attr("d", path);
    layer.select(".globe-drag-catcher").attr("r", globeScale * zoom);
    markers.each(function(d) {
      const g = d3.select(this);
      const pos = projection([d.lon, d.lat]);
      if (!pos) { g.style("display", "none"); return; }
      g.style("display", null);
      const [cx, cy] = pos;
      const r = sizeScale(d.salary);
      g.select("circle:nth-child(1)").attr("cx", cx).attr("cy", cy);
      g.select("circle:nth-child(2)").attr("cx", cx).attr("cy", cy);
      g.select("text").attr("x", cx).attr("y", cy - r - 8);
    });
  };

  const update = (newData) => {
    markers.data(newData.filter(d => d.hasData), d => d.region).each(function(d) {
      const g = d3.select(this);
      const pos = projection([d.lon, d.lat]);
      if (!pos) return;
      const [cx, cy] = pos;
      const r = sizeScale(d.salary);
      g.select("circle:nth-child(1)").attr("cx", cx).attr("cy", cy).attr("r", r + 6).attr("fill", INTENSITY_COLOR_SCALE(d.aiIntensity));
      g.select("circle:nth-child(2)").attr("cx", cx).attr("cy", cy).attr("r", r).attr("fill", INTENSITY_COLOR_SCALE(d.aiIntensity));
      g.select("text").attr("x", cx).attr("y", cy - r - 8).text(d.region);
    });
  };

  const updateCountryLabels = (countryData) => {
    countryLabelsLayer.selectAll("*").remove();
    if (!countryData?.length) return;
    countryData.forEach(d => {
      const pos = projection([d.lon, d.lat]);
      if (!pos) return;
      countryLabelsLayer.append("text")
        .attr("x", pos[0]).attr("y", pos[1] - 12)
        .attr("text-anchor", "middle").attr("fill", "#fff").attr("font-size", "9px").attr("font-weight", "500")
        .attr("paint-order", "stroke").attr("stroke", "rgba(0,0,0,0.6)").attr("stroke-width", 2.5)
        .text(d.country);
    });
  };

  return { redraw, update, updateCountryLabels };
}

/* ═══════════════════════════════════════════
   Task1 Component — Globe Only
   ═══════════════════════════════════════════ */
function Task1() {
  const [historyRows, setHistoryRows] = useState([]);
  const [worldData, setWorldData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);
  const [rotation, setRotation] = useState([-35, -16, 0]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const rotationRef = useRef(rotation);
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);

  const svgRef = useRef(null);
  const threeContainerRef = useRef(null);
  const sceneRef = useRef(null);
  const threeSceneRef = useRef(null);
  const globeTimerRef = useRef(null);
  const isInteractingRef = useRef(false);

  // Data loading
  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL;
    Promise.all([
      d3.csv(`${baseUrl}ai_impact_jobs_2010_2025.csv`, normalizeHistoryRow),
      d3.json(`${baseUrl}world-110m.json`),
    ]).then(([rows, world]) => {
      setHistoryRows(rows);
      setWorldData(world);
      setSelectedYear(d3.min(rows, r => r.postingYear) ?? null);
    }).finally(() => setIsLoading(false));
  }, []);

  const years = useMemo(() => Array.from(new Set(historyRows.map(r => r.postingYear))).sort((a, b) => a - b), [historyRows]);

  const regionSummary = useMemo(() => {
    const yearRows = selectedYear ? historyRows.filter(r => r.postingYear === selectedYear) : historyRows;
    return computeRegionSummary(yearRows);
  }, [historyRows, selectedYear]);

  const countrySummary = useMemo(() => {
    const yearRows = selectedYear ? historyRows.filter(r => r.postingYear === selectedYear) : historyRows;
    return computeCountrySummary(yearRows, selectedRegion);
  }, [historyRows, selectedYear, selectedRegion]);

  // Region detail panel data
  const regionDetail = useMemo(() => {
    if (!selectedRegion) return null;
    const yearRows = selectedYear ? historyRows.filter(r => r.postingYear === selectedYear) : historyRows;
    const regionRows = yearRows.filter(r => r.region === selectedRegion);
    if (!regionRows.length) return null;
    return {
      region: selectedRegion,
      avgSalary: d3.mean(regionRows, d => d.salaryUsd) || 0,
      avgAI: d3.mean(regionRows, d => d.aiIntensityScore) || 0,
      avgRisk: d3.mean(regionRows, d => d.automationRiskScore) || 0,
      jobCount: regionRows.length,
      topCountries: d3.rollups(regionRows, v => v.length, d => d.country)
        .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, n]) => ({ country: c, count: n })),
      industries: d3.rollups(regionRows, v => v.length, d => d.industry)
        .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([ind, n]) => ({ industry: ind, count: n })),
    };
  }, [selectedRegion, selectedYear, historyRows]);

  const resetView = () => {
    const startRot = [...rotation];
    const endRot = [-15, -10, 0];
    const startZoom = selectedRegion ? 2.2 : 1;
    setSelectedRegion(null);
    const ri = d3.interpolate(startRot, endRot);
    const zi = d3.interpolate(startZoom, 1);
    const timer = d3.timer((elapsed) => {
      const t = Math.min(1, elapsed / 1000);
      const e = d3.easeCubicInOut(t);
      const cr = ri(e), cz = zi(e);
      setRotation(cr);
      if (sceneRef.current?.globeBundle) sceneRef.current.globeBundle.redraw(cr, cz);
      if (threeSceneRef.current) {
        const { renderer, scene: s, camera, group } = threeSceneRef.current;
        group.rotation.y = cr[0] * (Math.PI / 180) - Math.PI / 2;
        group.rotation.x = -cr[1] * (Math.PI / 180);
        group.scale.set(cz, cz, cz);
        renderer.render(s, camera);
      }
      if (t === 1) timer.stop();
    });
  };

  // 3D bars for drilldown
  useEffect(() => {
    if (!threeSceneRef.current || !selectedRegion) {
      if (threeSceneRef.current?.barsGroup) threeSceneRef.current.barsGroup.clear();
      return;
    }
    const { barsGroup, renderer, scene: s, camera } = threeSceneRef.current;
    barsGroup.clear();
    const commonScale = Math.min(BASE_WIDTH, BASE_HEIGHT) * 0.45;
    const maxSalary = d3.max(countrySummary, d => d.salary) || 100000;

    countrySummary.forEach(d => {
      const h = (d.salary / maxSalary) * 150 + 25;
      const geo = new THREE.BoxGeometry(6, 1, 6);
      geo.translate(0, 0.5, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: INTENSITY_COLOR_SCALE(d.aiIntensity), transparent: true, opacity: 0.9,
        emissive: INTENSITY_COLOR_SCALE(d.aiIntensity), emissiveIntensity: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const pos = latLonToVector3(d.lat, d.lon, commonScale);
      mesh.position.copy(pos);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
      mesh.scale.set(1, 0.01, 1);
      barsGroup.add(mesh);
      const delay = Math.random() * 500;
      const start = Date.now() + delay;
      const grow = () => {
        const el = Date.now() - start;
        if (el < 0) { requestAnimationFrame(grow); return; }
        const t = Math.min(1, el / 1200);
        mesh.scale.set(1, h * d3.easeElasticOut(t, 1, 0.5), 1);
        if (t < 1) requestAnimationFrame(grow);
      };
      grow();
    });

    const frame = () => { renderer.render(s, camera); if (selectedRegion) requestAnimationFrame(frame); };
    frame();
  }, [selectedRegion, countrySummary]);

  // Main scene init
  useEffect(() => {
    if (!historyRows.length || !worldData || !svgRef.current) return;
    if (sceneRef.current) return;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${BASE_WIDTH} ${BASE_HEIGHT}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    svg.selectAll("*").remove();

    const root = svg.append("g");
    const globeLayer = root.append("g").attr("class", "scene-layer scene-globe");

    const onRegionClick = (region) => {
      const anchor = REGION_ANCHORS[region];
      if (!anchor) return;
      const startRot = [...rotationRef.current];
      const endRot = [-anchor[0], -anchor[1], 0];
      setSelectedRegion(region);
      const ri = d3.interpolate(startRot, endRot);
      const zi = d3.interpolate(1, 2.2);
      const timer = d3.timer((elapsed) => {
        const t = Math.min(1, elapsed / 1000);
        const e = d3.easeCubicInOut(t);
        const cr = ri(e), cz = zi(e);
        if (sceneRef.current?.globeBundle) sceneRef.current.globeBundle.redraw(cr, cz);
        if (threeSceneRef.current) {
          const { renderer, scene: s, camera, group } = threeSceneRef.current;
          group.rotation.y = cr[0] * (Math.PI / 180) - Math.PI / 2;
          group.rotation.x = -cr[1] * (Math.PI / 180);
          group.scale.set(cz, cz, cz);
          renderer.render(s, camera);
        }
        if (t === 1) { setRotation(cr); timer.stop(); }
      });
    };

    const globeBundle = drawGlobeScene(globeLayer, regionSummary, worldData, BASE_WIDTH, BASE_HEIGHT, rotation, onRegionClick);
    sceneRef.current = { svg, globeLayer, globeBundle };

    // Three.js globe
    if (threeContainerRef.current) {
      threeContainerRef.current.innerHTML = "";
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-BASE_WIDTH / 2, BASE_WIDTH / 2, BASE_HEIGHT / 2, -BASE_HEIGHT / 2, 0.1, 2000);
      camera.position.z = 1000;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(BASE_WIDTH, BASE_HEIGHT);
      threeContainerRef.current.appendChild(renderer.domElement);

      const group = new THREE.Group();
      group.position.y = -10;
      group.rotation.y = rotation[0] * (Math.PI / 180) - Math.PI / 2;
      group.rotation.x = -rotation[1] * (Math.PI / 180);
      scene.add(group);
      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
      dirLight.position.set(5, 3, 5);
      scene.add(dirLight);

      const texture = new THREE.TextureLoader().load(
        "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg"
      );
      const commonScale = Math.min(BASE_WIDTH, BASE_HEIGHT) * 0.45;
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(commonScale, 128, 128),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }),
      );
      group.add(globe);
      const barsGroup = new THREE.Group();
      group.add(barsGroup);
      threeSceneRef.current = { scene, camera, renderer, globe, group, barsGroup };

      const handleResize = () => {
        if (!threeContainerRef.current || !threeSceneRef.current) return;
        const rect = threeContainerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const aspect = BASE_WIDTH / BASE_HEIGHT;
        const domAspect = rect.width / rect.height;
        let vw, vh;
        if (domAspect > aspect) { vh = BASE_HEIGHT; vw = BASE_HEIGHT * domAspect; } else { vw = BASE_WIDTH; vh = BASE_WIDTH / domAspect; }
        const { camera: c, renderer: r } = threeSceneRef.current;
        c.left = -vw / 2; c.right = vw / 2; c.top = vh / 2; c.bottom = -vh / 2;
        c.updateProjectionMatrix();
        r.setSize(rect.width, rect.height);
        r.setPixelRatio(window.devicePixelRatio);
        r.render(scene, c);
      };
      const ro = new ResizeObserver(handleResize);
      ro.observe(threeContainerRef.current);
      handleResize();
      setTimeout(handleResize, 100);
      setTimeout(handleResize, 500);
      threeSceneRef.current.resizeObserver = ro;
    }

    // Drag — bind on SVG for globe rotation
    const dragHandler = d3.drag()
      .on("start", () => {
        isInteractingRef.current = true;
        if (globeTimerRef.current) globeTimerRef.current.stop();
      })
      .on("drag", (event) => {
        const bundle = sceneRef.current.globeBundle;
        const r = rotationRef.current;
        const nextRot = [r[0] + event.dx * 0.25, r[1] - event.dy * 0.25, r[2]];
        const activeZoom = threeSceneRef.current ? threeSceneRef.current.group.scale.x : 1.0;
        if (bundle) bundle.redraw(nextRot, activeZoom);
        if (threeSceneRef.current) {
          const { renderer: rr, scene: s, camera: c, group: g } = threeSceneRef.current;
          g.rotation.y = nextRot[0] * (Math.PI / 180) - Math.PI / 2;
          g.rotation.x = -nextRot[1] * (Math.PI / 180);
          g.scale.set(activeZoom, activeZoom, activeZoom);
          rr.render(s, c);
        }
        setRotation(nextRot);
      })
      .on("end", () => { isInteractingRef.current = true; });
    svg.call(dragHandler);

  }, [historyRows, worldData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update globe data when year changes
  useEffect(() => {
    if (!sceneRef.current || selectedYear === null) return;
    if (sceneRef.current.globeBundle) {
      sceneRef.current.globeBundle.update(regionSummary);
      sceneRef.current.globeBundle.updateCountryLabels(countrySummary);
    }
  }, [selectedYear, regionSummary, countrySummary]);

  // Auto-rotation
  useEffect(() => {
    if (!sceneRef.current?.globeBundle || isInteractingRef.current) return;
    if (globeTimerRef.current) globeTimerRef.current.stop();
    globeTimerRef.current = d3.timer((elapsed) => {
      if (isInteractingRef.current) { globeTimerRef.current.stop(); return; }
      const newRot = [rotation[0] + elapsed * 0.015, rotation[1], 0];
      sceneRef.current.globeBundle.redraw(newRot);
      if (threeSceneRef.current) {
        const { renderer, scene: s, camera, group } = threeSceneRef.current;
        group.rotation.y = newRot[0] * (Math.PI / 180) - Math.PI / 2;
        group.rotation.x = -newRot[1] * (Math.PI / 180);
        renderer.render(s, camera);
      }
    });
    return () => { if (globeTimerRef.current) globeTimerRef.current.stop(); };
  }, [rotation]);

  useEffect(() => () => { if (globeTimerRef.current) globeTimerRef.current.stop(); }, []);

  if (isLoading) return <div className="task1-loading">Loading globe data...</div>;

  return (
    <div className="task1-container">
      {/* Globe area */}
      <div className="globe-viewport">
        <div className="three-globe-layer" ref={threeContainerRef} />
        <svg ref={svgRef} className="globe-svg" />

        {/* Drilldown bar */}
        {selectedRegion && (
          <div className="drilldown-bar">
            <button className="back-btn" onClick={resetView}>← Back to Global</button>
            <span className="drilldown-region">{selectedRegion}</span>
            <span className="drilldown-year">Year: {selectedYear}</span>
          </div>
        )}

        {/* Region detail panel — shown when a region is clicked */}
        {regionDetail && (
          <div className="region-detail-panel">
            <div className="rdp-header">
              <h3>{regionDetail.region}</h3>
              <span className="rdp-year">{selectedYear}</span>
            </div>
            <div className="rdp-stats">
              <div className="rdp-stat">
                <span className="rdp-stat-label">Avg Salary</span>
                <span className="rdp-stat-value">${Math.round(regionDetail.avgSalary).toLocaleString()}</span>
              </div>
              <div className="rdp-stat">
                <span className="rdp-stat-label">AI Intensity</span>
                <span className="rdp-stat-value">{regionDetail.avgAI.toFixed(3)}</span>
              </div>
              <div className="rdp-stat">
                <span className="rdp-stat-label">Risk Score</span>
                <span className="rdp-stat-value">{(regionDetail.avgRisk * 100).toFixed(1)}%</span>
              </div>
              <div className="rdp-stat">
                <span className="rdp-stat-label">Job Count</span>
                <span className="rdp-stat-value">{regionDetail.jobCount}</span>
              </div>
            </div>
            <div className="rdp-section">
              <h4>Top Countries</h4>
              {regionDetail.topCountries.map(c => (
                <div key={c.country} className="rdp-row">
                  <span>{c.country}</span><span>{c.count} jobs</span>
                </div>
              ))}
            </div>
            <div className="rdp-section">
              <h4>Top Industries</h4>
              {regionDetail.industries.map(ind => (
                <div key={ind.industry} className="rdp-row">
                  <span>{ind.industry}</span><span>{ind.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inline legend (overlaid on globe) */}
        <div className="globe-legend-overlay">
          <div className="gl-section">
            <span className="gl-title">AI Intensity</span>
            <div className="gl-intensity-bar" />
            <div className="gl-range"><span>Low</span><span>High</span></div>
          </div>
          <div className="gl-divider" />
          <div className="gl-section">
            <span className="gl-title">Bubble Size</span>
            <span className="gl-subtitle">= Avg Salary</span>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="globe-controls">
        {years.length > 0 && (
          <div className="year-control">
            <label>Year</label>
            <input
              type="range"
              min={years[0]} max={years[years.length - 1]} step={1}
              value={selectedYear || years[0]}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            />
            <span className="year-value">{selectedYear}</span>
          </div>
        )}
        <div className="globe-tip">Click a region bubble to drill down · Drag to rotate</div>
      </div>
    </div>
  );
}

export default Task1;
