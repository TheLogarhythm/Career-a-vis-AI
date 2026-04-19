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
  Argentina: [-63.6, -38.4], Australia: [133.8, -25.3], Bangladesh: [90.3, 23.7], Brazil: [-51.9, -14.2],
  Canada: [-106.3, 56.1], Chile: [-71.5, -35.7], China: [104.2, 35.9], Colombia: [-74.1, 4.6],
  Egypt: [30.8, 26.8], France: [2.2, 46.2], Germany: [10.4, 51.2], Ghana: [-1.0, 7.9],
  India: [78.9, 21.0], Indonesia: [113.9, -0.8], Israel: [34.8, 31.0], Italy: [12.6, 41.9],
  Japan: [138.3, 36.2], Jordan: [36.2, 31.2], Kenya: [37.9, 0.0], Malaysia: [102.0, 4.2],
  Mexico: [-102.5, 23.6], Morocco: [-7.1, 31.8], Nepal: [84.1, 28.4], Netherlands: [5.3, 52.1],
  "New Zealand": [174.9, -40.9], Nigeria: [8.7, 9.1], Pakistan: [69.3, 30.4], Peru: [-75.0, -9.2],
  Philippines: [121.8, 12.8], Poland: [19.1, 51.9], Qatar: [51.2, 25.3], "Saudi Arabia": [45.1, 23.9],
  Singapore: [103.8, 1.35], "South Africa": [24.9, -30.6], "South Korea": [127.8, 36.5],
  Spain: [-3.7, 40.4], "Sri Lanka": [80.7, 7.9], Sweden: [18.6, 60.1], Taiwan: [121.0, 23.7],
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
    lon, lat,
  };
}

function computeRegionSummary(rows) {
  const allRegions = Object.keys(REGION_ANCHORS);
  const existingData = d3.rollups(
    rows,
    (values) => {
      const region = values[0].region;
      const [anchorLon, anchorLat] = REGION_ANCHORS[region] || [0, 0];
      return {
        lon: anchorLon, lat: anchorLat,
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
      region, lon: anchorLon, lat: anchorLat,
      aiIntensity: 0, salary: 0, count: 0, hasData: false
    };
  });
}

function computeCountrySummary(rows, region) {
  if (!region) return [];
  const regionRows = rows.filter((d) => d.region === region);
  return d3.rollups(
    regionRows,
    (values) => {
      const country = values[0].country;
      const [lon, lat] = COUNTRY_COORDS[country] || [0, 0];
      return {
        country, lon, lat,
        aiIntensity: d3.mean(values, (d) => d.aiIntensityScore) || 0,
        salary: d3.mean(values, (d) => d.salaryUsd) || 0,
        count: values.length,
      };
    },
    (d) => d.country,
  ).map(([_, stats]) => stats);
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

  const defs = layer.append("defs");
  const filter = defs.append("filter").attr("id", "marker-glow").attr("x", "-100%").attr("y", "-100%").attr("width", "300%").attr("height", "300%");
  filter.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "blur");
  filter.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

  const globeCenterX = width / 2;
  const globeCenterY = height / 2 - 20;
  const globeScale = Math.min(width, height) * 0.45;

  const projection = d3.geoOrthographic().scale(globeScale).translate([globeCenterX, globeCenterY]).rotate(currentRotation).clipAngle(90).precision(0.3);
  const path = d3.geoPath(projection);

  layer.append("path").datum({ type: "Sphere" }).attr("class", "globe-water").attr("d", path);
  layer.append("path").datum(d3.geoGraticule10()).attr("class", "globe-graticule").attr("d", path);

  if (worldData) {
    const countries = topojson.feature(worldData, worldData.objects.countries);
    layer.append("path").datum(countries).attr("class", "globe-land").attr("d", path).style("pointer-events", "none");
    layer.append("path").datum(topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b)).attr("class", "globe-borders").attr("d", path).style("pointer-events", "none");
  }



  const radiusScale = d3.scaleSqrt().domain([0, d3.max(regionSummary, (d) => d.salary) || 100000]).range([0, 60]);

  // 1. Drag catcher (moved down so markers are on top of it)
  layer.append("circle").attr("class", "globe-drag-catcher").attr("cx", globeCenterX).attr("cy", globeCenterY).attr("r", globeScale).attr("fill", "transparent").style("pointer-events", "all").style("cursor", "grab")
    .on("mousedown", function() { d3.select(this).style("cursor", "grabbing"); })
    .on("mouseup mouseleave", function() { d3.select(this).style("cursor", "grab"); });

  // 2. Markers (Clickable)
  const markersGroup = layer.append("g").attr("class", "globe-markers").style("pointer-events", "none");
  const markers = markersGroup.selectAll("g").data(regionSummary).join("g").attr("class", "region-marker").style("filter", "url(#marker-glow)").style("cursor", "pointer").style("pointer-events", "auto").on("click", (event, d) => onRegionClick && onRegionClick(d.region));

  // Invisible Hitbox (Large target area for easier clicking)
  markers
    .append("circle")
    .attr("class", "marker-hitbox")
    .attr("r", 60)
    .attr("fill", "none")
    .attr("stroke", "none")
    .style("pointer-events", "all");

  const visuals = markers.append("g").attr("class", "marker-visuals");
  visuals.append("circle").attr("class", "ring-outer").attr("r", (d) => radiusScale(d.salary) * 1.4).attr("fill", "none").attr("stroke", (d) => INTENSITY_COLOR_SCALE(d.aiIntensity)).attr("stroke-width", 2).attr("stroke-opacity", 0.6);
  visuals.append("circle").attr("class", "ring-middle").attr("r", (d) => radiusScale(d.salary) * 1.0).attr("fill", "none").attr("stroke", (d) => INTENSITY_COLOR_SCALE(d.aiIntensity)).attr("stroke-width", 3).attr("stroke-opacity", 0.8);
  visuals.append("circle").attr("class", "ring-inner").attr("r", (d) => radiusScale(d.salary) * 0.6).attr("fill", "none").attr("stroke", (d) => INTENSITY_COLOR_SCALE(d.aiIntensity)).attr("stroke-width", 4).attr("stroke-opacity", 1);
  visuals.append("circle").attr("class", "beacon-dot").attr("r", 6).attr("fill", "#fff");

  markers.append("text").attr("class", "region-label").attr("y", (d) => -radiusScale(d.salary) - 24).attr("text-anchor", "middle").attr("fill", "#fff").style("font-size", "18px").style("font-weight", "800").style("text-shadow", "0 2px 8px rgba(0,0,0,1)").text((d) => d.region);

  const countryLabelsLayer = layer.append("g").attr("class", "country-labels-layer").style("pointer-events", "none");

  let trackedZoom = 1;
  let trackedRotation = currentRotation;

  let labelNodes = [];
  const labelForce = d3.forceSimulation(labelNodes)
    .force("collide", d3.forceCollide().radius(45).iterations(4)) 
    .force("x", d3.forceX().x(d => d.targetX).strength(0.15))
    .force("y", d3.forceY().y(d => d.targetY).strength(0.15))
    .stop();

  const redraw = (newRot, zoom = null) => {
    if (newRot) trackedRotation = newRot;
    if (zoom !== null) trackedZoom = zoom;

    const zoomedScale = globeScale * trackedZoom;
    projection.scale(zoomedScale).rotate(trackedRotation);
    const center = [-trackedRotation[0], -trackedRotation[1]];

    layer.selectAll(".globe-water, .globe-graticule, .globe-land, .globe-borders").attr("d", path);
    layer.selectAll(".globe-drag-catcher").attr("r", zoomedScale);

    markers.each(function (d) {
      const coord = [d.lon, d.lat];
      const dist = d3.geoDistance(coord, center);
      const point = projection(coord);
      const selection = d3.select(this);
      if (!point || dist > Math.PI / 2 || !d.hasData || trackedZoom > 1.5) {
        selection.style("opacity", 0).attr("transform", "translate(-9999, -9999)");
        return;
      }
      const fadeThreshold = Math.PI / 2 - 0.25;
      const opacity = dist < fadeThreshold ? 1 : Math.max(0, 1 - (dist - fadeThreshold) / 0.25);
      const f = Math.cos(dist);
      const angle = Math.atan2(point[1] - globeCenterY, point[0] - globeCenterX) * (180 / Math.PI);
      selection.style("opacity", opacity).attr("transform", `translate(${point[0]}, ${point[1]})`);
      selection.select(".marker-visuals").attr("transform", `rotate(${angle}) scale(${f}, 1)`);
    });



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
        
        const maxSalary = d3.max(labelNodes, n => n.salary) || 100000;
        const height3D = (d.salary / maxSalary) * 150 + 25; 
        
        let dx = point[0] - globeCenterX;
        let dy = point[1] - globeCenterY;
        const radius2D = Math.hypot(dx, dy) || 1;
        dx /= radius2D;
        dy /= radius2D;
        
        const tipOffset = height3D * trackedZoom * Math.sin(dist);
        const tipX = point[0] + dx * tipOffset;
        const tipY = point[1] + dy * tipOffset;
        
        node.anchorX = tipX;
        node.anchorY = tipY;
        
        node.targetX = tipX + dx * 20;
        node.targetY = tipY + dy * 20; 
        node.visible = true;
        
        if (!node.x && !node.y) {
           node.x = node.targetX;
           node.y = node.targetY;
        }
        
        activeNodes.push(node);
      });
      
    if (activeNodes.length > 0) {
      labelForce.nodes(activeNodes);
      labelForce.alpha(1);
      for (let i = 0; i < 30; i++) labelForce.tick();
      
      countryLabelsLayer.selectAll(".country-label-group")
        .each(function(d) {
          const node = activeNodes.find(n => n.country === d.country);
          if(!node || !node.visible) return;
          
          const sel = d3.select(this);
          sel.style("opacity", 1)
             .attr("transform", `translate(${node.x}, ${node.y})`);
             
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
    const rScale = d3.scaleSqrt().domain([0, d3.max(newSummary, d => d.salary) || 100000]).range([0, 60]);
    markers.data(newSummary, d => d.region).each(function(d) {
      const sel = d3.select(this);
      sel.select(".ring-outer").attr("r", rScale(d.salary) * 1.4).attr("stroke", INTENSITY_COLOR_SCALE(d.aiIntensity));
      sel.select(".ring-middle").attr("r", rScale(d.salary)).attr("stroke", INTENSITY_COLOR_SCALE(d.aiIntensity));
      sel.select(".ring-inner").attr("r", rScale(d.salary) * 0.6).attr("stroke", INTENSITY_COLOR_SCALE(d.aiIntensity));
      sel.select(".region-label").attr("y", -rScale(d.salary) - 24);
    });
  };

  const updateCountryLabels = (cSummary) => {
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
      
    labels.append("path")
      .attr("class", "leader-line")
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.7)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "2 3");
      
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

    labels.append("text")
      .attr("y", 4)
      .attr("fill", "#fff")
      .style("font-size", "14px")
      .style("font-weight", 700)
      .style("cursor", "default")
      .text(d => `${d.country} ($${d3.format(",.0f")(d.salary)})`);

    labels.transition().duration(300).style("opacity", 1);
    
    let layoutTicks = 0;
    const settleTimer = d3.timer(() => {
       redraw(null, null);
       layoutTicks++;
       if (layoutTicks > 40) settleTimer.stop();
    });
  };

  return { redraw, update, updateCountryLabels };
}


function Task1() {
  const [historyRows, setHistoryRows] = useState([]);
  const [worldData, setWorldData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);
  const [rotation, setRotation] = useState([-35, -16, 0]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [isZooming, setIsZooming] = useState(false);

  const svgRef = useRef(null);
  const threeContainerRef = useRef(null);
  const miniSvgRef = useRef(null);
  const sceneRef = useRef(null);
  const threeSceneRef = useRef(null);
  const rotationRef = useRef(rotation);
  const isInteractingRef = useRef(false);
  const globeTimerRef = useRef(null);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL;
    Promise.all([
      d3.csv(`${baseUrl}ai_impact_jobs_2010_2025.csv`, normalizeHistoryRow),
      d3.json(`${baseUrl}world-110m.json`),
    ]).then(([rows, world]) => {
      setHistoryRows(rows);
      setWorldData(world);
      setSelectedYear(d3.min(rows, (d) => d.postingYear) ?? null);
      setIsLoading(false);
    });
  }, []);

  const years = useMemo(() => Array.from(new Set(historyRows.map((r) => r.postingYear))).sort(), [historyRows]);
  const regionSummary = useMemo(() => computeRegionSummary(selectedYear ? historyRows.filter(r => r.postingYear === selectedYear) : historyRows), [historyRows, selectedYear]);
  const countrySummary = useMemo(() => computeCountrySummary(selectedYear ? historyRows.filter(r => r.postingYear === selectedYear) : historyRows, selectedRegion), [historyRows, selectedYear, selectedRegion]);


  const resetView = () => {
    setSelectedRegion(null);
    setIsZooming(false);
    const startRotation = [...rotation];
    const endRotation = [-15, -10, 0];
    const interpolator = d3.interpolate(startRotation, endRotation);
    const zoomInterpolator = d3.interpolate(2.2, 1);
    const transitionDuration = 1000;
    
    if (globeTimerRef.current) globeTimerRef.current.stop();
    globeTimerRef.current = d3.timer((elapsed) => {
      const t = Math.min(1, elapsed / transitionDuration);
      const easedT = d3.easeCubicInOut(t);
      const currentRot = interpolator(easedT);
      const currentZoom = zoomInterpolator(easedT);
      setRotation(currentRot);
      rotationRef.current = currentRot;
      
      if (sceneRef.current?.globeBundle) {
          sceneRef.current.globeBundle.redraw(currentRot, currentZoom);
      }
      
      if (threeSceneRef.current) {
        const { renderer, scene: tScene, camera, group } = threeSceneRef.current;
        group.rotation.y = currentRot[0] * (Math.PI / 180) - Math.PI / 2;
        group.rotation.x = -currentRot[1] * (Math.PI / 180);
        group.scale.set(currentZoom, currentZoom, currentZoom);
        renderer.render(tScene, camera);
      }
      
      if (t === 1) {
        isInteractingRef.current = false; // Allow auto-rotate to resume
        return true; 
      }
    });
  };

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
      const height = (d.salary / maxSalary) * 150 + 25; 
      const geometry = new THREE.BoxGeometry(6, 1, 6); 
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
      
      const normal = pos.clone().normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      
      mesh.scale.set(1, 0.01, 1);
      barsGroup.add(mesh);

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

    const frame = () => {
       renderer.render(tScene, camera);
       if (selectedRegion) requestAnimationFrame(frame);
    };
    frame();

  }, [selectedRegion, countrySummary]);

  useEffect(() => {
    if (!historyRows.length || !worldData || !svgRef.current || !miniSvgRef.current) return;
    
    if (!sceneRef.current) {
      const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${BASE_WIDTH} ${BASE_HEIGHT}`).attr("preserveAspectRatio", "xMidYMid meet");
      svg.selectAll("*").remove();

      const globeLayer = svg.append("g").attr("class", "scene-layer scene-globe");

      const onRegionClick = (region) => {
        const anchor = REGION_ANCHORS[region];
        if (!anchor) return;
        
        isInteractingRef.current = true;
        if (globeTimerRef.current) globeTimerRef.current.stop();

        setSelectedRegion(region);
        setIsZooming(true);

        const startRotation = [...rotationRef.current];
        const endRotation = [-anchor[0], -anchor[1], 0];

        const interpolator = d3.interpolate(startRotation, endRotation);
        const zoomInterpolator = d3.interpolate(1, 2.2);

        const transitionDuration = 1000;
        globeTimerRef.current = d3.timer((elapsed) => {
          const t = Math.min(1, elapsed / transitionDuration);
          const easedT = d3.easeCubicInOut(t);
          
          const currentRot = interpolator(easedT);
          const currentZoom = zoomInterpolator(easedT);

          if (sceneRef.current && sceneRef.current.globeBundle) {
            sceneRef.current.globeBundle.redraw(currentRot, currentZoom);
          }
          
          if (threeSceneRef.current) {
            const { renderer, scene: tScene, camera, group } = threeSceneRef.current;
            group.rotation.y = currentRot[0] * (Math.PI / 180) - Math.PI / 2;
            group.rotation.x = -currentRot[1] * (Math.PI / 180);
            group.scale.set(currentZoom, currentZoom, currentZoom);
            renderer.render(tScene, camera);
          }

          if (t === 1) {
            setRotation(currentRot); 
            return true; // Stop timer
          }
        });
      };

      const globeBundle = drawGlobeScene(globeLayer, regionSummary, worldData, BASE_WIDTH, BASE_HEIGHT, rotation, onRegionClick);

      sceneRef.current = {
        svg,
        globeLayer,
        globeBundle,
      };

      // Three.js Photorealistic Globe Setup
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
        group.position.y = 20;
        scene.add(group);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 3, 5);
        scene.add(dirLight);

        const loader = new THREE.TextureLoader();
        const texture = loader.load("https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg");
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        const commonScale = Math.min(BASE_WIDTH, BASE_HEIGHT) * 0.45;
        const geometry = new THREE.SphereGeometry(commonScale, 128, 128);
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 1,
        });
        const globe = new THREE.Mesh(geometry, material);
        group.add(globe);

        const barsGroup = new THREE.Group();
        group.add(barsGroup);

        threeSceneRef.current = { scene, camera, renderer, globe, group, barsGroup };

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
            viewHeight = BASE_HEIGHT;
            viewWidth = BASE_HEIGHT * domAspect;
          } else {
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

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(threeContainerRef.current);
        handleResize();
      }

      // Mini Globe Controller
      const miniWidth = 120;
      const miniHeight = 120;
      const miniSvg = d3.select(miniSvgRef.current).attr("width", miniWidth).attr("height", miniHeight);

      miniSvg.selectAll("*").remove();

      const miniProjection = d3.geoOrthographic().scale(55).translate([miniWidth / 2, miniHeight / 2]).rotate(rotation).clipAngle(90);
      const miniPath = d3.geoPath(miniProjection);

      miniSvg.append("circle").attr("cx", miniWidth / 2).attr("cy", miniHeight / 2).attr("r", 60).attr("class", "mini-water");

      if (worldData) {
        miniSvg.append("path").datum(topojson.feature(worldData, worldData.objects.land)).attr("class", "mini-land").attr("d", miniPath);
      }

      const dragHandler = d3.drag()
        .on("start", (event) => {
          isInteractingRef.current = true;
          if (globeTimerRef.current) globeTimerRef.current.stop();
          
          const isMini = !!event.sourceEvent.target.closest('svg[width="120"]');
          if (isMini) {
            setSelectedRegion(null);
            setIsZooming(false);
          }
        })
        .on("drag", (event) => {
          const r = rotationRef.current;
          const sensitivity = 0.25;
          const nextRotation = [r[0] + event.dx * sensitivity, r[1] - event.dy * sensitivity, r[2]];

          miniProjection.rotate(nextRotation);
          miniSvg.selectAll(".mini-land").attr("d", miniPath);

          const isMini = !!event.sourceEvent.target.closest('svg[width="120"]');
          const activeZoom = isMini ? 1.0 : (threeSceneRef.current ? threeSceneRef.current.group.scale.x : 1.0);

          if (sceneRef.current && sceneRef.current.globeBundle) {
            sceneRef.current.globeBundle.redraw(nextRotation, activeZoom);
          }

          if (threeSceneRef.current) {
            const { renderer, scene: tScene, camera, group } = threeSceneRef.current;
            group.rotation.y = nextRotation[0] * (Math.PI / 180) - Math.PI / 2;
            group.rotation.x = -nextRotation[1] * (Math.PI / 180);
            group.scale.set(activeZoom, activeZoom, activeZoom);
            renderer.render(tScene, camera);
          }

          rotationRef.current = nextRotation; 
          setRotation(nextRotation);
        })
        .on("end", () => {
          // Keep auto-rotate off while user is manual, but don't block
          isInteractingRef.current = true;
        });

      miniSvg.call(dragHandler);
      svg.call(dragHandler); // Bind to entire container for robust dragging

      // Start Auto-Rotate
      globeTimerRef.current = d3.timer(() => {
        if (isInteractingRef.current) {
            globeTimerRef.current.stop();
            return;
        }

        const newRotation = [rotationRef.current[0] + 0.1, rotationRef.current[1], 0];
        if (sceneRef.current && sceneRef.current.globeBundle) {
            sceneRef.current.globeBundle.redraw(newRotation);
        }

        if (threeSceneRef.current) {
            const { renderer, scene: tScene, camera, group } = threeSceneRef.current;
            group.rotation.y = newRotation[0] * (Math.PI / 180) - Math.PI / 2;
            group.rotation.x = -newRotation[1] * (Math.PI / 180);
            renderer.render(tScene, camera);
        }
        setRotation(newRotation);
      });
    }
  }, [historyRows, worldData]);


  useEffect(() => {
    if (sceneRef.current?.globeBundle) {
      sceneRef.current.globeBundle.update(regionSummary);
      sceneRef.current.globeBundle.updateCountryLabels(countrySummary);
    }
  }, [regionSummary, countrySummary]);

  useEffect(() => {
    return () => {
      if (globeTimerRef.current) {
        globeTimerRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="task1-root">
      <div className="three-globe-container" ref={threeContainerRef} />
      <svg ref={svgRef} className="story-svg" />

      {selectedRegion && (
        <div className="drilldown-controls">
          <button className="back-btn" onClick={resetView}>
            ← Back to Global View
          </button>
          <div className="drilldown-title">
            <h3>{selectedRegion}</h3>
          </div>
        </div>
      )}

      {years.length > 0 && (
        <div className="year-slider-wrap">
          <input
            id="year-slider"
            type="range"
            min={years[0]}
            max={years[years.length - 1]}
            step={1}
            value={selectedYear || years[0]}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
          />
          <span className="year-val">{selectedYear}</span>
        </div>
      )}

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

      <div className="mini-globe-wrap">
        <svg ref={miniSvgRef} className="mini-svg" />
      </div>

      {isLoading ? <p className="loading-text">Loading...</p> : null}
    </div>
  );
}

export default Task1;
