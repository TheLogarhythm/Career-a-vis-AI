import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "../styles/DetailedDistribution.css";

function DetailedDistribution({ metric, data, onClose }) {
  const chartRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    drawChart();
  }, [metric, data]);

  // 严格的数据验证和转换
  const normalizeValue = (val) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed === null || parsed === undefined) return null;
    // 数据格式是 0-1 范围，直接返回
    return parsed;
  };

  const calculateStats = () => {
    switch (metric) {
      case "country":
        const countryCounts = {};
        data.forEach((d) => {
          countryCounts[d.country] = (countryCounts[d.country] || 0) + 1;
        });
        const sortedCountries = Object.entries(countryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15);
        return {
          type: "country",
          data: sortedCountries,
          title: "地区分布 (Top 15)",
          description: `共涵盖 ${Object.keys(countryCounts).length} 个国家`,
          details: sortedCountries.slice(0, 5).map((c) => `${c[0]}: ${c[1]} 个职位`),
        };
      
      case "ai_intensity":
        // 严格过滤有效数据 (0-1 范围)
        const intensities = data
          .map((d) => normalizeValue(d.ai_intensity_score))
          .filter((v) => v !== null && v >= 0 && v <= 1);
        
        if (intensities.length === 0) {
          return {
            type: "ai_histogram",
            data: [],
            title: "AI 强度分布",
            description: "无有效数据",
            details: ["无数据"],
          };
        }

        const bins = [
          { range: "0-20%", count: intensities.filter((v) => v < 0.2).length },
          { range: "20-40%", count: intensities.filter((v) => v >= 0.2 && v < 0.4).length },
          { range: "40-60%", count: intensities.filter((v) => v >= 0.4 && v < 0.6).length },
          { range: "60-80%", count: intensities.filter((v) => v >= 0.6 && v < 0.8).length },
          { range: "80-100%", count: intensities.filter((v) => v >= 0.8).length },
        ];
        
        const avg = (intensities.reduce((a, b) => a + b) / intensities.length * 100).toFixed(1);
        const max = (Math.max(...intensities) * 100).toFixed(1);
        const min = (Math.min(...intensities) * 100).toFixed(1);
        
        return {
          type: "ai_histogram",
          data: bins,
          title: "AI 强度分布 (直方图)",
          description: `显示职位AI强度的分布情况`,
          stats: { avg, max, min },
          details: [
            `总样本数: ${intensities.length}`,
            `平均值: ${avg}%`,
            `最大值: ${max}%`,
            `最小值: ${min}%`,
          ],
        };
      
      case "automation_risk":
        // 严格过滤有效数据 (0-1 范围)
        const risks = data
          .map((d) => normalizeValue(d.automation_risk_score))
          .filter((v) => v !== null && v >= 0 && v <= 1);
        
        if (risks.length === 0) {
          return {
            type: "risk_histogram",
            data: [],
            title: "自动化风险分布",
            description: "无有效数据",
            details: ["无数据"],
          };
        }

        const riskBins = [
          { range: "0-20%", count: risks.filter((v) => v < 0.2).length },
          { range: "20-40%", count: risks.filter((v) => v >= 0.2 && v < 0.4).length },
          { range: "40-60%", count: risks.filter((v) => v >= 0.4 && v < 0.6).length },
          { range: "60-80%", count: risks.filter((v) => v >= 0.6 && v < 0.8).length },
          { range: "80-100%", count: risks.filter((v) => v >= 0.8).length },
        ];
        
        const riskAvg = (risks.reduce((a, b) => a + b) / risks.length * 100).toFixed(1);
        const highRiskCount = risks.filter((v) => v > 0.6).length;
        
        return {
          type: "risk_histogram",
          data: riskBins,
          title: "自动化风险分布 (直方图)",
          description: `展示职位自动化风险的分布`,
          stats: { avg: riskAvg, high: highRiskCount },
          details: [
            `总样本数: ${risks.length}`,
            `平均风险: ${riskAvg}%`,
            `高风险职位 (>60%): ${highRiskCount} 个`,
            `高风险占比: ${((highRiskCount / risks.length) * 100).toFixed(1)}%`,
          ],
        };
      
      case "displacement_risk":
        // 按 industry 分类，计算 automation_risk 平均值
        const industryStats = {};
        
        data.forEach((d) => {
          const industry = d.industry || "Unknown";
          const risk = normalizeValue(d.automation_risk_score);
          
          // 只处理有效的风险数据 (0-1 范围)
          if (risk !== null && !isNaN(risk) && risk >= 0 && risk <= 1) {
            if (!industryStats[industry]) {
              industryStats[industry] = { sum: 0, count: 0 };
            }
            industryStats[industry].sum += risk;
            industryStats[industry].count += 1;
          }
        });

        const industryData = Object.entries(industryStats)
          .map(([industry, stats]) => {
            const avgRisk = stats.count > 0 ? stats.sum / stats.count : 0;
            return {
              label: industry,
              avgRisk: avgRisk, // 保持 0-1 格式用于饼图
              count: stats.count,
              percentage: (avgRisk * 100).toFixed(1), // 转换为百分比用于显示
            };
          })
          .sort((a, b) => b.avgRisk - a.avgRisk);

        return {
          type: "industry_pie",
          data: industryData,
          title: "行业自动化风险分布 (饼图)",
          description: `按行业统计的平均自动化风险水平`,
          details: industryData.slice(0, 8).map(
            (d) => `${d.label}: ${d.percentage}% (${d.count}个职位)`
          ),
        };
      
      default:
        return null;
    }
  };

  const drawChart = () => {
    if (!chartRef.current) return;
    
    const stats = calculateStats();
    if (!stats || !stats.data || stats.data.length === 0) return;

    const width = 280;
    const height = 220;
    const margin = { top: 10, right: 10, bottom: 30, left: 50 };

    d3.select(chartRef.current).selectAll("*").remove();

    if (stats.type === "country") {
      const svg = d3
        .select(chartRef.current)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const xScale = d3
        .scaleBand()
        .domain(stats.data.map((d) => d[0]))
        .range([0, innerWidth])
        .padding(0.4);

      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(stats.data, (d) => d[1])])
        .range([innerHeight, 0]);

      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      g.selectAll(".bar")
        .data(stats.data)
        .join("rect")
        .attr("class", "bar")
        .attr("x", (d) => xScale(d[0]))
        .attr("y", (d) => yScale(d[1]))
        .attr("width", xScale.bandwidth())
        .attr("height", (d) => innerHeight - yScale(d[1]))
        .attr("fill", "#0a9396")
        .attr("opacity", 0.7)
        .on("mouseenter", (event, d) => {
          setTooltip({ x: event.pageX, y: event.pageY, text: `${d[0]}: ${d[1]} 个职位` });
        })
        .on("mouseleave", () => setTooltip(null));

      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("font-size", "9px")
        .attr("transform", "rotate(-45)")
        .attr("text-anchor", "end");

      g.append("g").call(d3.axisLeft(yScale)).selectAll("text").attr("font-size", "9px");
    } 
    else if (stats.type === "ai_histogram" || stats.type === "risk_histogram") {
      const svg = d3
        .select(chartRef.current)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const xScale = d3
        .scaleBand()
        .domain(stats.data.map((d) => d.range))
        .range([0, innerWidth])
        .padding(0.3);

      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(stats.data, (d) => d.count)])
        .range([innerHeight, 0]);

      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const color = stats.type === "ai_histogram" ? "#ee9b00" : "#9b2226";

      g.selectAll(".bar")
        .data(stats.data)
        .join("rect")
        .attr("x", (d) => xScale(d.range))
        .attr("y", (d) => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", (d) => innerHeight - yScale(d.count))
        .attr("fill", color)
        .attr("opacity", 0.8)
        .on("mouseenter", (event, d) => {
          setTooltip({ x: event.pageX, y: event.pageY, text: `${d.range}: ${d.count} 个职位` });
        })
        .on("mouseleave", () => setTooltip(null));

      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("font-size", "9px");

      g.append("g").call(d3.axisLeft(yScale)).selectAll("text").attr("font-size", "9px");
    } 
    else if (stats.type === "industry_pie") {
      const svg = d3
        .select(chartRef.current)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

      const radius = Math.min(width, height) / 2 - 20;
      const g = svg
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

      // 用 avgRisk (0-1格式) 来确定饼图大小
      const pie = d3.pie().value((d) => d.avgRisk);
      const arc = d3.arc().innerRadius(0).outerRadius(radius);

      const colors = d3.schemeCategory10;

      const arcs = g
        .selectAll(".arc")
        .data(pie(stats.data))
        .join("g")
        .attr("class", "arc");

      arcs
        .append("path")
        .attr("d", arc)
        .attr("fill", (d, i) => colors[i % colors.length])
        .attr("opacity", 0.8)
        .on("mouseenter", (event, d) => {
          setTooltip({
            x: event.pageX,
            y: event.pageY,
            text: `${d.data.label}: ${d.data.percentage}%`,
          });
        })
        .on("mouseleave", () => setTooltip(null));

      arcs
        .append("text")
        .attr("transform", (d) => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .attr("fill", "white")
        .text((d) => `${d.data.percentage}%`);
    }
  };

  const stats = calculateStats();

  return (
    <div className="detailed-distribution">
      <div className="detail-header">
        <h3>{stats.title}</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      
      <div className="detail-description">{stats.description}</div>

      <div className="chart-container" ref={chartRef}></div>

      <div className="detail-stats">
        <div className="detail-label">详情统计:</div>
        {stats.details.map((detail, idx) => (
          <div key={idx} className="detail-item">
            • {detail}
          </div>
        ))}
      </div>

      {tooltip && (
        <div
          className="tooltip"
          style={{ top: `${tooltip.y}px`, left: `${tooltip.x}px` }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

export default DetailedDistribution;
