import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import * as THREE from "three";
import "./task1.css";

const REGION_COLORS = d3.scaleOrdinal([
  "#0a9396", "#ee9b00", "#9b2226", "#005f73", "#ca6702",
  "#6d597a", "#3a86ff", "#2a9d8f", "#457b9d"
]);

const REGION_ANCHORS = {
  Africa: [20, 6], "East Asia": [115, 30], Europe: [12, 52],
  "Middle East": [45, 30], "North America": [-100, 40],
  Oceania: [140, -25], "South America": [-60, -15],
  "South Asia": [78, 20], "Southeast Asia": [105, 7]
};

const COUNTRY_COORDS = {
  "United States": [-98.6, 39.8], "United Kingdom": [-3.4, 55.4],
  Germany: [10.4, 51.2], France: [2.2, 46.2], Japan: [138.3, 36.2],
  China: [104.2, 35.9], India: [78.9, 21.0], Brazil: [-51.9, -14.2],
  Canada: [-106.3, 56.1], Australia: [133.8, -25.3],
  // ... 其他坐标
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
    lon, lat,
  };
}

function computeRegionSummary(rows) {
  return d3.rollups(rows,
    (values) => ({
      lon: d3.mean(values, (d) => d.lon) || 0,
      lat: d3.mean(values, (d) => d.lat) || 0,
      aiIntensity: d3.mean(values, (d) => d.aiIntensityScore) || 0,
      salary: d3.mean(values, (d) => d.salaryUsd) || 0,
      count: values.length,
    }),
    (d) => d.region
  ).map(([region, stats]) => ({ region, ...stats }))
   .sort((a, b) => d3.descending(a.aiIntensity, b.aiIntensity));
}

function drawGlobeScene(layer, regionSummary, worldData, width, height, currentRotation) {
  layer.selectAll("*").remove();

  const globeCenterX = width / 2;
  const globeCenterY = height / 2 + 10;
  const globeScale = Math.min(width, height) * 0.45;

  const projection = d3.geoOrthographic()
    .scale(globeScale)
    .translate([globeCenterX, globeCenterY])
    .rotate(currentRotation)
    .clipAngle(90)
    .precision(0.3);

  const path = d3.geoPath(projection);

  // 海洋
  layer.append("path").datum({ type: "Sphere" })
    .attr("class", "globe-water")
    .attr("d", path);

  // 经纬线
  layer.append("path").datum(d3.geoGraticule10())
    .attr("class", "globe-graticule")
    .attr("d", path);

  // 陆地
  if (worldData) {
    const countries = topojson.feature(worldData, worldData.objects.countries);
    layer.append("path").datum(countries)
      .attr("class", "globe-land")
      .attr("d", path);
    layer.append("path")
      .datum(topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b))
      .attr("class", "globe-borders")
      .attr("d", path);
  }

  // 区域标记
  const radiusScale = d3.scaleSqrt()
    .domain(d3.extent(regionSummary, (d) => d.salary))
    .range([8, 24]);

  const markers = layer.append("g")
    .selectAll("g")
    .data(regionSummary)
    .join("g");

  markers.append("circle")
    .attr("r", (d) => radiusScale(d.salary))
    .attr("fill", (d) => REGION_COLORS(d.region))
    .attr("fill-opacity", 0.9)
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5);

  markers.append("text")
    .attr("class", "region-label")
    .attr("y", (d) => -radiusScale(d.salary) - 7)
    .attr("text-anchor", "middle")
    .text((d) => d.region);

  const redraw = (rotation) => {
    projection.rotate(rotation);
    const center = [-rotation[0], -rotation[1]];
    layer.selectAll("path").attr("d", path);
    markers.attr("transform", (d) => {
      const point = projection([d.lon, d.lat]);
      return point ? `translate(${point[0]}, ${point[1]})` : "translate(-9999,-9999)";
    }).attr("display", (d) => 
      d3.geoDistance([d.lon, d.lat], center) < Math.PI / 2 ? null : "none"
    );
  };

  return { redraw };
}

function Task1() {
  const [historyRows, setHistoryRows] = useState([]);
  const [worldData, setWorldData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);
  const [rotation, setRotation] = useState([-35, -16, 0]);
  // 注意：这里删除了activeStep状态！

  const svgRef = useRef(null);
  const threeContainerRef = useRef(null);
  const miniSvgRef = useRef(null);
  const sceneRef = useRef(null);
  const threeSceneRef = useRef(null);
  const globeTimerRef = useRef(null);
  const isInteractingRef = useRef(false);

  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL;
    Promise.all([
      d3.csv(`${baseUrl}ai_impact_jobs_2010_2025.csv`, normalizeHistoryRow),
      d3.json(`${baseUrl}world-110m.json`),
    ])
      .then(([rows, world]) => {
        setHistoryRows(rows);
        setWorldData(world);
        const firstYear = d3.min(rows, (row) => row.postingYear);
        setSelectedYear(firstYear ?? null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const regionSummary = useMemo(() => computeRegionSummary(historyRows), [historyRows]);

  // 初始化场景（只保留Globe）
  useEffect(() => {
    if (!historyRows.length || !worldData || !svgRef.current || !miniSvgRef.current) return;

    const width = 1180;
    const height = 760;
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    svg.selectAll("*").remove();

    const root = svg.append("g");
    const globeLayer = root.append("g").attr("class", "scene-layer scene-globe");

    const globeBundle = drawGlobeScene(globeLayer, regionSummary, worldData, width, height, rotation);
    sceneRef.current = { svg, width, height, globeLayer, globeBundle };

    // Three.js 地球（带纹理回退）
    if (threeContainerRef.current) {
      threeContainerRef.current.innerHTML = "";
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0.1, 2000);
      camera.position.z = 1000;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(width, height);
      threeContainerRef.current.appendChild(renderer.domElement);

      const group = new THREE.Group();
      group.position.y = -10;
      scene.add(group);

      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
      dirLight.position.set(5, 3, 5);
      scene.add(dirLight);

      // 尝试加载纹理，失败则用纯色
      const loader = new THREE.TextureLoader();
      const geometry = new THREE.SphereGeometry(Math.min(width, height) * 0.45, 128, 128);
      const material = new THREE.MeshStandardMaterial({
        color: 0x2d5a3d, // 默认绿色
        roughness: 1
      });
      
      loader.load(
        "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
        (texture) => {
          material.map = texture;
          material.color = new THREE.Color(0xffffff);
          material.needsUpdate = true;
        },
        undefined,
        (err) => console.log("Using fallback earth color")
      );

      const globe = new THREE.Mesh(geometry, material);
      group.add(globe);
      threeSceneRef.current = { scene, camera, renderer, globe, group };

      // 动画循环
      const animate = () => {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();
    }

    // Mini Globe Controller
    const miniWidth = 120, miniHeight = 120;
    const miniSvg = d3.select(miniSvgRef.current)
      .attr("width", miniWidth).attr("height", miniHeight);
    miniSvg.selectAll("*").remove();

    const miniProjection = d3.geoOrthographic()
      .scale(55).translate([miniWidth/2, miniHeight/2])
      .rotate(rotation).clipAngle(90);
    const miniPath = d3.geoPath(miniProjection);

    miniSvg.append("circle")
      .attr("cx", miniWidth/2).attr("cy", miniHeight/2).attr("r", 60)
      .attr("class", "mini-water");

    if (worldData) {
      miniSvg.append("path")
        .datum(topojson.feature(worldData, worldData.objects.land))
        .attr("class", "mini-land")
        .attr("d", miniPath);
    }

    // 拖拽交互
    const dragHandler = d3.drag()
      .on("start", () => {
        isInteractingRef.current = true;
        if (globeTimerRef.current) globeTimerRef.current.stop();
      })
      .on("drag", (event) => {
        const r = miniProjection.rotate();
        const sensitivity = 0.25;
        const nextRotation = [r[0] + event.dx * sensitivity, r[1] - event.dy * sensitivity, r[2]];

        miniProjection.rotate(nextRotation);
        miniSvg.selectAll(".mini-land").attr("d", miniPath);

        if (sceneRef.current?.globeBundle) {
          sceneRef.current.globeBundle.redraw(nextRotation);
        }

        if (threeSceneRef.current) {
          const { globe, renderer, scene: tScene, camera } = threeSceneRef.current;
          globe.rotation.y = nextRotation[0] * (Math.PI / 180) - Math.PI / 2;
          globe.rotation.x = -nextRotation[1] * (Math.PI / 180);
          renderer.render(tScene, camera);
        }

        setRotation(nextRotation);
      })
      .on("end", () => { isInteractingRef.current = true; });

    miniSvg.call(dragHandler);

    // 自动旋转（Globe场景一直显示，所以一直自动旋转）
    if (globeTimerRef.current) globeTimerRef.current.stop();
    globeTimerRef.current = d3.timer((elapsed) => {
      if (isInteractingRef.current) return;
      const newRotation = [rotation[0] + elapsed * 0.015, rotation[1], 0];
      if (sceneRef.current?.globeBundle) {
        sceneRef.current.globeBundle.redraw(newRotation);
      }
      if (threeSceneRef.current) {
        const { globe, renderer, scene: tScene, camera } = threeSceneRef.current;
        globe.rotation.y = newRotation[0] * (Math.PI / 180) - Math.PI / 2;
        renderer.render(tScene, camera);
      }
    });

    return () => {
      if (globeTimerRef.current) globeTimerRef.current.stop();
    };
  }, [historyRows, worldData, regionSummary, rotation]);

  if (isLoading) {
    return <div className="task1-loading">Loading Globe Data...</div>;
  }

  return (
    <div className="task1-container">
      <div className="task1-content">
        {/* Three.js 地球层 */}
        <div className="three-globe-container" ref={threeContainerRef} />
        
        {/* D3 SVG 叠加层（标记点） */}
        <svg ref={svgRef} className="task1-svg" />
        
        {/* Mini Globe Controller */}
        <div className="mini-globe-wrap">
          <div className="mini-globe-label">Drag to Rotate</div>
          <svg ref={miniSvgRef} className="mini-svg" />
        </div>
        
        {/* 说明文字覆盖层 - 放在左边 */}
        <div className="task1-overlay">
          <h2>1. Regional Globe: AI Impact Footprint</h2>
          <p>
            A 3D-style orthographic globe summarizes AI intensity by region. 
            Bubble size shows salary level, and color marks each region.
            <br /><br />
            <strong>Drag the mini globe</strong> to rotate the view.
            The globe auto-rotates until you interact with it.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Task1;
