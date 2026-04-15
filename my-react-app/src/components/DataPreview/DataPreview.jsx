import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import './DataPreview.css';

const DataPreview = () => {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [columnStats, setColumnStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [expandedColumn, setExpandedColumn] = useState(null);
  const [showDetailedStats, setShowDetailedStats] = useState(false);

  // 计算详细列统计（用于横向滚动行）
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
        // 分类列：显示 top-2 值和 Others 条形图
        const valueCounts = d3.rollups(rawData, v => v.length, d => d[col])
          .sort((a, b) => b[1] - a[1]);
        const total = rawData.length;
        const unique = valueCounts.length;
        const n = Math.min(2, valueCounts.length);
        const topItems = valueCounts.slice(0, n).map(([key, count]) => ({
          key, count, pct: ((count / total) * 100).toFixed(0)
        }));
        const othersCount = valueCounts.slice(n).reduce((sum, [, c]) => sum + c, 0);
        const othersPct = othersCount > 0 ? ((othersCount / total) * 100).toFixed(0) : '0';
        stats[col] = { 
          type: 'catBars', 
          topItems, 
          othersCount, 
          othersPct,
          othersLabel: n < unique ? `Other (${unique - n})` : null,
          unique,
          total 
        };
      }
    });
    
    return stats;
  };

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
      {/* 文件头部 - 点击展开/收起详细统计 */}
      <div 
        className={`file-header clickable ${showDetailedStats ? 'expanded' : ''}`} 
        onClick={() => setShowDetailedStats(!showDetailedStats)}
      >
        <div className="file-icon">📄</div>
        <div className="file-info">
          <div className="file-name" title="Click to toggle detailed stats">ai_impact_jobs_2010_2025.csv</div>
          <div className="file-meta">{stats.totalRows.toLocaleString()} rows × {stats.columns} columns</div>
        </div>
        <div className="click-hint">{showDetailedStats ? '👆 Collapse' : '👆 Expand'}</div>
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

      {/* 3. 可展开的详细统计（迷你图表）- 网格布局 */}
      <div className={`detailed-stats-section ${showDetailedStats ? 'visible' : 'collapsed'}`}>
        <div className="section-label">Column Statistics</div>
        <div className="stats-grid-cards">
          {Object.keys(columnStats).map(col => (
            <div 
              key={col} 
              className={`stat-cell ${expandedColumn === col ? 'active' : ''}`} 
              title={col}
              onClick={(e) => {
                e.stopPropagation();
                setExpandedColumn(expandedColumn === col ? null : col);
              }}
            >
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

      {/* 展开式详情面板 */}
      {expandedColumn && columnStats[expandedColumn] && (
        <DetailPanel 
          column={expandedColumn} 
          data={columnStats[expandedColumn]} 
          onClose={() => setExpandedColumn(null)}
        />
      )}

      {/* 4. 可展开的数据预览表格 */}
      <div className={`preview-table-container ${showDetailedStats ? 'visible' : 'collapsed'}`}>
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

      {/* 全局Tooltip - 修正定位，考虑页面滚动 */}
      {tooltip && (
        <div 
          className="global-tooltip" 
          style={{
            left: `${tooltip.x + 16}px`,
            top: `${tooltip.y + 16}px`,
            maxWidth: '200px'
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

// 展开式详情面板组件
const DetailPanel = ({ column, data, onClose }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (panelRef.current) {
      // 平滑滚动到详情面板
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    if (!panelRef.current || !data) return;
    
    const container = d3.select(panelRef.current).select('.detail-chart-container');
    container.selectAll("*").remove();

    const rect = panelRef.current.getBoundingClientRect();
    const width = rect.width - 40;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    const svg = container.append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("display", "block");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    if (data.type === 'bar' || data.type === 'hist') {
      const values = data.type === 'bar' ? data.data.map(d => d[1]) : data.data.map(d => d.length);
      const maxVal = data.max || d3.max(values) || 1;
      
      const xScale = d3.scaleBand()
        .domain(d3.range(values.length))
        .range([0, chartWidth])
        .padding(0.15);
      
      const yScale = d3.scaleLinear()
        .domain([0, maxVal])
        .range([chartHeight, 0]);

      g.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale).tickFormat((d, i) => {
          if (data.type === 'bar' && data.data[i]) return data.data[i][0];
          return '';
        }).tickSize(0))
        .selectAll("text")
        .attr("font-size", "10px")
        .attr("fill", "#64748b")
        .attr("text-anchor", "middle");

      g.append("g")
        .call(d3.axisLeft(yScale).ticks(5).tickSize(0))
        .selectAll("text")
        .attr("font-size", "10px")
        .attr("fill", "#64748b");

      g.selectAll("rect")
        .data(values)
        .join("rect")
        .attr("x", (d, i) => xScale(i))
        .attr("y", d => yScale(d))
        .attr("width", xScale.bandwidth())
        .attr("height", d => chartHeight - yScale(d))
        .attr("fill", "#0ea5e9")
        .attr("rx", 4)
        .attr("opacity", 0.85);

    } else if (data.type === 'pie') {
      const radius = Math.min(chartWidth, chartHeight) / 2;
      const pie = d3.pie().value(d => d.count).sort(null);
      const arc = d3.arc().innerRadius(0).outerRadius(radius);
      const labelArc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius * 0.6);

      const gCenter = svg.append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

      gCenter.selectAll("path")
        .data(pie(data.data))
        .join("path")
        .attr("d", arc)
        .attr("fill", (d, i) => i === 0 ? '#0ea5e9' : '#cbd5e1')
        .attr("opacity", 0.85);

      gCenter.selectAll("text")
        .data(pie(data.data))
        .join("text")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-weight", "600")
        .attr("fill", "#0f172a")
        .text(d => `${d.data.key}: ${d.data.pct}%`);
    }
  }, [column, data]);

  return (
    <div className="detail-panel-expanded" ref={panelRef}>
      <div className="detail-panel-header">
        <div className="detail-panel-title">
          <span className="detail-column-name">{column}</span>
          <span className={`detail-type-badge ${getColumnType(column)}`}>
            {getColumnTypeLabel(column)}
          </span>
        </div>
        <button className="detail-close-btn" onClick={onClose}>✕</button>
      </div>
      
      <div className="detail-chart-container" />
      
      <div className="detail-stats-grid">
        {data.type === 'text' && (
          <>
            <div className="detail-stat-item">
              <span className="detail-stat-label">Unique Values</span>
              <span className="detail-stat-value">{data.unique}</span>
            </div>
            <div className="detail-stat-item">
              <span className="detail-stat-label">Total Records</span>
              <span className="detail-stat-value">{data.total}</span>
            </div>
            <div className="detail-stat-item">
              <span className="detail-stat-label">Top Values</span>
              <div className="detail-top-values">
                {data.topValues?.map((v, i) => (
                  <span key={i} className="detail-value-tag">{v}</span>
                ))}
              </div>
            </div>
          </>
        )}
        {data.type === 'pie' && (
          <>
            <div className="detail-stat-item">
              <span className="detail-stat-label">Total Records</span>
              <span className="detail-stat-value">{data.data.reduce((s, d) => s + d.count, 0)}</span>
            </div>
            {data.data.map((d, i) => (
              <div key={i} className="detail-stat-item">
                <span className="detail-stat-label">{d.key}</span>
                <span className="detail-stat-value">{d.count} ({d.pct}%)</span>
              </div>
            ))}
          </>
        )}
        {(data.type === 'bar' || data.type === 'hist') && (
          <>
            <div className="detail-stat-item">
              <span className="detail-stat-label">Range</span>
              <span className="detail-stat-value">
                {data.extent ? `${data.extent[0]} - ${data.extent[1]}` : 'N/A'}
              </span>
            </div>
            <div className="detail-stat-item">
              <span className="detail-stat-label">Max Count</span>
              <span className="detail-stat-value">{data.max}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Helper functions
const getColumnType = (col) => {
  if (col === 'posting_year') return 'temporal';
  if (col === 'ai_mentioned' || col === 'reskilling_required') return 'categorical';
  if (['ai_intensity_score', 'automation_risk_score', 'salary_usd', 'salary_change_vs_prev_year_percent'].includes(col)) return 'numeric';
  return 'text';
};

const getColumnTypeLabel = (col) => {
  const type = getColumnType(col);
  return type.charAt(0).toUpperCase() + type.slice(1);
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
    // 清除之前的所有内容
    container.selectAll("*").remove();

    // 获取实际容器尺寸以确保响应式渲染
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : 120;
    const height = rect.height > 0 ? rect.height : 50;
    const margin = {top: 5, right: 5, bottom: 5, left: 5};

    const svg = container.append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("display", "block");

    if (data.type === 'pie') {
      const radius = Math.min(width, height) / 2 - margin.top;
      const pie = d3.pie().value(d => d.count).sort(null);
      const arc = d3.arc().innerRadius(0).outerRadius(radius);
      
      const g = svg.append("g")
        .attr("transform", `translate(${width/2},${height/2})`);
      
      g.selectAll("path")
        .data(pie(data.data))
        .join("path")
        .attr("d", arc)
        .attr("fill", (d, i) => i === 0 ? '#0ea5e9' : '#cbd5e1')
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          d3.select(this).style("opacity", 0.7);
          onHover && onHover(`${d.data.key}: ${d.data.count} (${d.data.pct}%)`, event);
        })
        .on("mouseout", function() {
          d3.select(this).style("opacity", 1);
          onLeave && onLeave();
        });
        
    } else if (data.type === 'bar' || data.type === 'hist') {
      // 过滤掉无效数据项，防止渲染时出现 undefined 错误
      const validData = data.data ? data.data.filter(d => d != null && d !== undefined) : [];
      const values = data.type === 'bar' 
        ? validData.map(d => d[1]).filter(v => v != null && !isNaN(v)) 
        : validData.map(d => d.length).filter(v => v != null && !isNaN(v));
      
      // 如果没有有效数据，不渲染图表
      if (values.length === 0) return;
      
      const maxVal = data.max || d3.max(values) || 1;
      
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;
      
      const xScale = d3.scaleBand()
        .domain(d3.range(values.length))
        .range([0, chartWidth])
        .padding(0.15);
      
      const yScale = d3.scaleLinear()
        .domain([0, maxVal])
        .range([chartHeight, 0]);

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      g.selectAll("rect")
        .data(values)
        .join("rect")
        .attr("x", (d, i) => xScale(i))
        .attr("y", d => yScale(d))
        .attr("width", xScale.bandwidth())
        .attr("height", d => chartHeight - yScale(d))
        .attr("fill", "#0ea5e9")
        .attr("rx", 2)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d, i) {
          d3.select(this).style("opacity", 0.7);
          
          // 添加空值检查，防止访问 undefined 属性
          let range = '';
          if (data.type === 'hist') {
            const binData = data.data && data.data[i];
            if (binData) {
              const x0 = binData.x0 != null ? binData.x0.toFixed(1) : '';
              const x1 = binData.x1 != null ? binData.x1.toFixed(1) : '';
              range = `${x0}-${x1}`;
            } else {
              range = 'N/A';
            }
          } else {
            const barData = data.data && data.data[i];
            range = barData && barData[0] != null ? barData[0] : 'N/A';
          }
          
          onHover && onHover(`${range}: ${d} records`, event);
        })
        .on("mouseout", function() {
          d3.select(this).style("opacity", 1);
          onLeave && onLeave();
        });
    } else if (data.type === 'text') {
      svg.append("text")
        .attr("x", width/2)
        .attr("y", height/2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "700")
        .attr("fill", "#0ea5e9")
        .text(`${data.unique}/${data.total}`);
    } else if (data.type === 'catBars') {
      // 分类列：显示 top-2 值和 Others 条形图
      const items = data.topItems || [];
      const hasOthers = data.othersLabel !== null;
      const allItems = [...items, ...(hasOthers ? [{ key: data.othersLabel, pct: data.othersPct }] : [])];
      const maxPct = Math.max(...allItems.map(i => +i.pct), 1);
      const colors = ['#0ea5e9', '#10b981'];
      const itemHeight = height / allItems.length;

      allItems.forEach((item, idx) => {
        const rowY = 5 + idx * itemHeight;
        const barWidth = width * 0.45;
        const barX = width * 0.52;
        const barFill = idx < items.length ? colors[idx % 2] : '#d1d5db';

        const row = svg.append("g")
          .style("cursor", "pointer")
          .on("mouseenter", (event) => onHover && onHover(`${item.key}: ${item.pct}%`, event))
          .on("mouseleave", () => onLeave && onLeave());

        row.append("circle")
          .attr("cx", 5).attr("cy", rowY + itemHeight * 0.5)
          .attr("r", 3).attr("fill", barFill);

        const label = item.key.length > 8 ? item.key.substring(0, 8) + '…' : item.key;
        row.append("text")
          .attr("x", 13).attr("y", rowY + itemHeight * 0.5)
          .attr("font-size", "8px").attr("fill", "#64748b")
          .attr("dominant-baseline", "middle")
          .text(label);

        row.append("rect")
          .attr("x", barX).attr("y", rowY + 1)
          .attr("width", barWidth).attr("height", itemHeight - 2)
          .attr("rx", 3).attr("fill", "#f1f5f9");

        row.append("rect")
          .attr("x", barX).attr("y", rowY + 1)
          .attr("width", Math.max(4, (+item.pct / maxPct) * barWidth))
          .attr("height", itemHeight - 2)
          .attr("rx", 3).attr("fill", barFill);

        row.append("text")
          .attr("x", barX + barWidth + 6).attr("y", rowY + itemHeight * 0.5)
          .attr("font-size", "8px").attr("fill", "#64748b")
          .attr("dominant-baseline", "middle")
          .text(item.pct + '%');
      });
    }

    // Cleanup 函数
    return () => {
      container.selectAll("*").remove();
    };
  }, [data, column, onHover, onLeave]);

  return (
    <div 
      ref={containerRef} 
      className="mini-viz-container"
    />
  );
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
