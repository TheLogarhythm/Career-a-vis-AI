import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import './DataPreview.css';

const DataPreview = ({ onShowFullTable }) => {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [columnStats, setColumnStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const rawData = await d3.csv('/ai_impact_jobs_2010_2025.csv');
        setData(rawData.slice(0, 5));
        
        // 计算四个主要统计
        const years = rawData.map(d => +d.posting_year);
        const industries = [...new Set(rawData.map(d => d.industry))];
        const countries = [...new Set(rawData.map(d => d.country))];
        const regions = [...new Set(rawData.map(d => d.region))];
        
        const yearCounts = d3.rollups(rawData, v => v.length, d => d.posting_year)
          .sort((a, b) => d3.ascending(a[0], b[0]));
        
        setStats({
          totalRows: rawData.length,
          columns: Object.keys(rawData[0]).length,
          yearRange: [d3.min(years), d3.max(years)],
          yearCounts: yearCounts,
          industries: industries.length,
          countries: countries.length,
          regions: regions.length
        });

        // 计算详细列统计（用于横向滚动行）
        setColumnStats(computeColumnStats(rawData));
        setLoading(false);
      } catch (error) {
        console.error("Failed to load data:", error);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const computeColumnStats = (rawData) => {
    const stats = {};
    const columns = Object.keys(rawData[0]);
    
    columns.forEach(col => {
      const values = rawData.map(d => d[col]);
      const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      
      if (col === 'posting_year') {
        const counts = d3.rollups(rawData, v => v.length, d => d[col]).sort((a,b) => a[0]-b[0]);
        stats[col] = { type: 'bar', data: counts, max: d3.max(counts, d => d[1]) };
      }
      else if (col === 'ai_mentioned' || col === 'reskilling_required') {
        const counts = d3.rollup(rawData, v => v.length, d => d[col]);
        const total = rawData.length;
        stats[col] = { 
          type: 'pie', 
          data: Array.from(counts, ([k, v]) => ({ key: k, count: v, pct: (v/total*100).toFixed(0) }))
        };
      }
      else if (['ai_intensity_score', 'automation_risk_score'].includes(col)) {
        // 使用实际数据范围，而不是固定0-1
        const extent = d3.extent(numericValues);
        const hist = d3.bin().domain(extent).thresholds(8)(numericValues);
        stats[col] = { type: 'hist', data: hist, extent, max: d3.max(hist, d => d.length) };
      }
      else if (col === 'salary_usd') {
        const extent = d3.extent(numericValues);
        const hist = d3.bin().domain(extent).thresholds(8)(numericValues);
        stats[col] = { type: 'hist', data: hist, extent, max: d3.max(hist, d => d.length), format: 'k' };
      }
      else if (col === 'salary_change_vs_prev_year_percent') {
        const extent = d3.extent(numericValues);
        const hist = d3.bin().domain(extent).thresholds(8)(numericValues);
        stats[col] = { type: 'hist', data: hist, extent, max: d3.max(hist, d => d.length), format: '%' };
      }
      else {
        // 文本列：显示唯一值数
        const unique = [...new Set(values)].length;
        stats[col] = { type: 'text', unique, total: values.length };
      }
    });
    
    return stats;
  };

  if (loading) {
    return (
      <div className="kaggle-preview loading scrolly-adapted">
        <div className="preview-spinner">📊</div>
        <span>Loading dataset...</span>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="kaggle-preview scrolly-adapted">
      {/* 文件头部 */}
      <div className="file-header clickable" onClick={onShowFullTable}>
        <div className="file-icon">📄</div>
        <div className="file-info">
          <div className="file-name" title="Click to view full table">ai_impact_jobs_2010_2025.csv</div>
          <div className="file-meta">{stats.totalRows.toLocaleString()} rows × {stats.columns} columns</div>
        </div>
        <div className="click-hint">👆 Click</div>
      </div>

      {/* 2. 四个主要统计卡片（2x2网格） */}
      <div className="stats-grid-kaggle">
        <StatCard 
          title="Years" 
          icon="📅" 
          value={`${stats.yearRange[0]} - ${stats.yearRange[1]}`}
          tooltip="Year range of job postings"
        >
          <MiniBarChart 
            data={stats.yearCounts} 
            maxValue={stats.yearCounts.length > 0 ? d3.max(stats.yearCounts, d => d[1]) : 1}
            onHover={(item, e) => setTooltip({x: e.clientX, y: e.clientY, text: `${item[0]}: ${item[1]} jobs`})}
            onLeave={() => setTooltip(null)}
          />
        </StatCard>

        <StatCard 
          title="Industries" 
          icon="🏭" 
          value={stats.industries}
          subtitle="sectors covered"
          tooltip="Number of unique industries"
        />

        <StatCard 
          title="Countries" 
          icon="🌍" 
          value={stats.countries}
          subtitle="global reach"
          tooltip="Number of countries"
        />

        <StatCard 
          title="Regions" 
          icon="🌐" 
          value={stats.regions}
          subtitle="continental areas"
          tooltip="Number of regions"
        />
      </div>

      {/* 3. 横向滚动的详细统计（迷你图表） */}
      <div className="detailed-stats-section">
        <div className="section-label">Column Statistics (scroll →)</div>
        <div className="stats-scroll-container">
          <div className="stats-row">
            {Object.keys(columnStats).map(col => (
              <div key={col} className="stat-cell" title={col}>
                <div className="cell-header">{col}</div>
                <div className="cell-viz">
                  <MiniViz 
                    data={columnStats[col]} 
                    column={col}
                    onHover={(text, e) => setTooltip({x: e.clientX, y: e.clientY, text})}
                    onLeave={() => setTooltip(null)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. 数据预览表格 */}
      <div className="preview-table-container">
        <div className="table-title">Data Preview (first 5 rows)</div>
        <div className="table-scroll-x">
          <table className="preview-table">
            <thead>
              <tr>
                {data.length > 0 && Object.keys(data[0]).map(col => (
                  <th key={col} className={getColumnClass(col)}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx}>
                  {Object.keys(row).map(col => (
                    <td key={col} className={getColumnClass(col)} title={row[col]}>
                      {formatCell(row[col], col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 全局Tooltip */}
      {tooltip && (
        <div className="global-tooltip" style={{left: tooltip.x + 10, top: tooltip.y - 30}}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

// 统计卡片组件
const StatCard = ({ title, icon, value, subtitle, children, tooltip }) => (
  <div className="stat-card" title={tooltip}>
    <div className="stat-header">
      <span className="stat-icon">{icon}</span>
      <span className="stat-name">{title}</span>
    </div>
    <div className="stat-value-large">{value}</div>
    {subtitle && <div className="stat-detail">{subtitle}</div>}
    {children && <div className="stat-chart">{children}</div>}
  </div>
);

// 迷你柱状图（带互动）
const MiniBarChart = ({ data, maxValue, onHover, onLeave }) => (
  <div className="mini-chart">
    {data.map((item, i) => (
      <div 
        key={i} 
        className="mini-bar-wrapper"
        onMouseEnter={(e) => onHover && onHover(item, e)}
        onMouseLeave={onLeave}
      >
        <div 
          className="mini-bar" 
          style={{height: `${maxValue > 0 ? (item[1] / maxValue * 100) : 0}%`}}
        />
      </div>
    ))}
  </div>
);

// 详细迷你可视化
const MiniViz = ({ data, column, onHover, onLeave }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;
    const container = d3.select(containerRef.current);
    container.selectAll("*").remove();

    const width = 85;
    const height = 50;
    const margin = {top: 5, right: 2, bottom: 2, left: 2};

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height);

    if (data.type === 'pie') {
      const pie = d3.pie().value(d => d.count).sort(null);
      const arc = d3.arc().innerRadius(0).outerRadius(Math.min(width, height)/2 - 2);
      
      const g = svg.append("g")
        .attr("transform", `translate(${width/2},${height/2})`);
      
      g.selectAll("path")
        .data(pie(data.data))
        .join("path")
        .attr("d", arc)
        .attr("fill", (d, i) => i === 0 ? '#0ea5e9' : '#cbd5e1')
        .on("mouseover", (event, d) => {
          onHover && onHover(`${d.data.key}: ${d.data.count} (${d.data.pct}%)`, event);
        })
        .on("mouseout", () => onLeave && onLeave());
        
    } else if (data.type === 'bar' || data.type === 'hist') {
      const values = data.type === 'bar' ? data.data.map(d => d[1]) : data.data.map(d => d.length);
      const maxVal = data.max || d3.max(values) || 1;
      
      const xScale = d3.scaleBand()
        .domain(d3.range(values.length))
        .range([margin.left, width - margin.right])
        .padding(0.1);
      
      const yScale = d3.scaleLinear()
        .domain([0, maxVal])
        .range([height - margin.bottom, margin.top]);

      svg.selectAll("rect")
        .data(values)
        .join("rect")
        .attr("x", (d, i) => xScale(i))
        .attr("y", d => yScale(d))
        .attr("width", xScale.bandwidth())
        .attr("height", d => yScale(0) - yScale(d))
        .attr("fill", "#0ea5e9")
        .on("mouseover", (event, d, i) => {
          const range = data.type === 'hist' ? 
            `${data.data[i].x0.toFixed(1)}-${data.data[i].x1.toFixed(1)}` : 
            data.data[i][0];
          onHover && onHover(`${range}: ${d} records`, event);
        })
        .on("mouseout", () => onLeave && onLeave());
    } else if (data.type === 'text') {
      svg.append("text")
        .attr("x", width/2)
        .attr("y", height/2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "12px")
        .attr("font-weight", "700")
        .attr("fill", "#0ea5e9")
        .text(`${data.unique}/${data.total}`);
    }

  }, [data, onHover, onLeave]);

  return <div ref={containerRef} className="mini-viz-container"></div>;
};

const getColumnClass = (col) => {
  if (col.includes('id')) return 'col-id';
  if (col.includes('year')) return 'col-year';
  if (col.includes('salary')) return 'col-salary';
  return '';
};

const formatCell = (val, col) => {
  if (!val) return '-';
  if (col.includes('id')) return val.substring(0, 8) + '...';
  if (col.includes('salary') && !isNaN(parseFloat(val))) {
    return '$' + (parseFloat(val)/1000).toFixed(0) + 'k';
  }
  if (val.length > 15) return val.substring(0, 15) + '...';
  return val;
};

export default DataPreview;
