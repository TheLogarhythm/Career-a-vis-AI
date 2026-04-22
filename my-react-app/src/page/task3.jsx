import React, { useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import "./task3.css";

function Heatmap() {
  const [data, setData] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    // 加载数据并处理成热力图需要的格式 (Industry vs AI Impact Level)
    d3.csv("/ai_job_trends_dataset.csv").then((rawData) => {
      // 统计每个 Industry 在不同 AI Impact Level 下的平均 Automation Risk (%)
      // 或者统计数量，这里我们按截图要求模拟：Industry vs AI Impact Level 的分布
      const processed = d3.rollups(
        rawData,
        v => d3.mean(v, d => +d["Automation Risk (%)"]),
        d => d.Industry,
        d => d["AI Impact Level"]
      );

      const formattedData = [];
      processed.forEach(([industry, levels]) => {
        levels.forEach(([level, value]) => {
          formattedData.push({ industry, level, value });
        });
      });
      setData(formattedData);
    });
  }, []);

  useEffect(() => {
    if (data.length === 0 || !containerRef.current) return;

    // 清空画布
    d3.select(containerRef.current).selectAll("*").remove();

    const margin = { top: 50, right: 100, bottom: 50, left: 120 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // 坐标轴
    const industries = Array.from(new Set(data.map(d => d.industry)));
    const levels = Array.from(new Set(data.map(d => d.level)));

    const x = d3.scaleBand()
      .range([0, width])
      .domain(levels)
      .padding(0.05);
    
    svg.append("g")
      .style("font-size", 12)
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickSize(0))
      .select(".domain").remove();

    const y = d3.scaleBand()
      .range([height, 0])
      .domain(industries)
      .padding(0.05);
    
    svg.append("g")
      .style("font-size", 12)
      .call(d3.axisLeft(y).tickSize(0))
      .select(".domain").remove();

    // 颜色比例尺 (Viridis 风格)
    const myColor = d3.scaleSequential()
      .interpolator(d3.interpolateViridis)
      .domain([0, 100]);

    // 绘制格子
    svg.selectAll()
      .data(data, d => d.industry + ':' + d.level)
      .enter()
      .append("rect")
      .attr("x", d => x(d.level))
      .attr("y", d => y(d.industry))
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => myColor(d.value))
      .style("stroke-width", 4)
      .style("stroke", "none")
      .style("opacity", 0.8)
      .on("mouseover", function(event, d) {
          d3.select(this).style("stroke", "black").style("opacity", 1);
      })
      .on("mouseleave", function(event, d) {
          d3.select(this).style("stroke", "none").style("opacity", 0.8);
      });

    // 标题
    svg.append("text")
        .attr("x", 0)
        .attr("y", -20)
        .attr("text-anchor", "left")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("AI Intensity Heatmap by Industry and Impact Level");

  }, [data]);

  return <div ref={containerRef} className="heatmap-container"></div>;
}

const useRef = React.useRef; // 快速修复

function Task3({ scrollParentRef }) {
  return (
    <div className="task3-layout">
      {/* 左侧：热力图可视化 */}
      <div className="task3-visual-side">
        <Heatmap />
      </div>

      {/* 右侧：描述文本 */}
      <div className="task3-text-side">
        <div className="task3-description-top">
          <h2 className="task3-title">Industry Transformation Insights</h2>
          <p className="task3-p">
            Our heatmap analysis reveals the intense concentration of AI impact across 
            diverse industrial sectors. By correlating industry types with AI impact 
            levels and automation risks, we identify where the digital workforce 
            evolution is most aggressive.
          </p>
          <p className="task3-p">
            High-intensity areas (indicated in yellow) signal sectors where AI 
            integration is fundamentally redefining job descriptions and skill 
            requirements.
          </p>
        </div>
        
        {/* 预留的定义介绍区域 */}
        <div className="task3-definition-placeholder">
          {/* 后续添加变量定义介绍 */}
        </div>
      </div>
    </div>
  );
}

export default Task3;
