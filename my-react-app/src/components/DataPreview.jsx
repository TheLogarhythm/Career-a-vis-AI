import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import './DataPreview.css';

const DataPreview = ({ onShowFullTable }) => {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [columnStats, setColumnStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [hoveredColumn, setHoveredColumn] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const rawData = await d3.csv('/ai_impact_jobs_2010_2025.csv');
        setData(rawData.slice(0, 5));
        
        // 计算主要统计
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

        // 计算详细列统计（增强版）
        setColumnStats(computeEnhancedColumnStats(rawData));
        setLoading(false);
      } catch (error) {
        console.error("Failed to load data:", error);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 在 computeEnhancedColumnStats 函数中替换对应的代码块
const computeEnhancedColumnStats = (rawData) => {
  const stats = {};
  const columns = Object.keys(rawData[0]);
  
  columns.forEach(col => {
    const values = rawData.map(d => d[col]);
    const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    const uniqueValues = [...new Set(values)];
    
    let type = 'text';
    if (col.includes('year') || col.includes('date')) type = 'temporal';
    else if (numericValues.length > values.length * 0.8) type = 'numeric';
    else if (uniqueValues.length <= 50) type = 'categorical';
    
    let distribution = [];
    let topValues = [];
    
    // 关键修复：salary_change 使用固定范围 -5 到 18，每 2.3 一格
    if (col === 'salary_change_vs_prev_year_percent') {
      const fixedMin = -5;
      const fixedMax = 18;
      const step = 2.3;
      
      // 生成阈值：-5, -2.7, -0.4, 1.9, 4.2, 6.5, 8.8, 11.1, 13.4, 15.7, 18
      const thresholds = [];
      for (let t = fixedMin + step; t < fixedMax; t += step) {
        thresholds.push(parseFloat(t.toFixed(1)));
      }
      
      const hist = d3.bin()
        .domain([fixedMin, fixedMax])
        .thresholds(thresholds)(numericValues);
        
      distribution = hist.map((b, i) => ({
        range: `${b.x0.toFixed(1)}~${b.x1.toFixed(1)}`,
        count: b.length,
        percentage: (b.length / values.length * 100),
        index: i
      }));
      
      topValues = [
        { value: `Range: ${fixedMin} to ${fixedMax}`, count: 0 }
      ];
      
      stats[col] = {
        type: 'numeric',
        unique: uniqueValues.length,
        total: values.length,
        missing: values.filter(v => !v || v === '').length,
        distribution,
        topValues,
        extent: [fixedMin, fixedMax], // 使用固定范围而非数据范围
        isFixedRange: true // 标记为固定范围
      };
    }
    else if (type === 'categorical' || type === 'text') {
      const counts = d3.rollup(values, v => v.length, d => d);
      const sorted = Array.from(counts, ([value, count]) => ({
        value: value || '(empty)',
        count,
        percentage: (count / values.length * 100)
      })).sort((a, b) => b.count - a.count);
      
      // Top 2 + Others
      if (sorted.length > 2) {
        const top2 = sorted.slice(0, 2);
        const others = sorted.slice(2);
        const othersCount = d3.sum(others, d => d.count);
        distribution = [
          ...top2,
          { 
            value: `Other (${others.length})`, 
            count: othersCount, 
            percentage: (othersCount / values.length * 100),
            isOther: true 
          }
        ];
      } else {
        distribution = sorted;
      }
      topValues = sorted.slice(0, 3);
      
      stats[col] = {
        type,
        unique: uniqueValues.length,
        total: values.length,
        missing: values.filter(v => !v || v === '').length,
        distribution,
        topValues
      };
    } 
    else if (type === 'numeric') {
      const extent = d3.extent(numericValues);
      const hist = d3.bin().domain(extent).thresholds(8)(numericValues);
      distribution = hist.map((b, i) => ({
        range: `${b.x0.toFixed(1)}-${b.x1.toFixed(1)}`,
        count: b.length,
        percentage: (b.length / values.length * 100),
        index: i
      }));
      topValues = [
        { value: `Min: ${extent[0].toFixed(2)}`, count: 0 },
        { value: `Max: ${extent[1].toFixed(2)}`, count: 0 }
      ];
      
      stats[col] = {
        type,
        unique: uniqueValues.length,
        total: values.length,
        missing: values.filter(v => !v || v === '').length,
        distribution,
        topValues,
        extent
      };
    } 
    else if (type === 'temporal') {
      const counts = d3.rollups(rawData, v => v.length, d => d[col])
        .sort((a, b) => d3.ascending(a[0], b[0]));
      distribution = counts.map(([year, count]) => ({
        value: year,
        count,
        percentage: (count / values.length * 100)
      }));
      
      stats[col] = {
        type,
        unique: uniqueValues.length,
        total: values.length,
        missing: values.filter(v => !v || v === '').length,
        distribution
      };
    }
  });
  
  return stats;
};


  if (loading) {
    return (
      <div className="kaggle-preview loading">
        <div className="preview-spinner">📊</div>
        <span>Loading dataset...</span>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="kaggle-preview">
      {/* 文件头部 */}
      <div className="file-header clickable" onClick={onShowFullTable}>
        <div className="file-icon">📄</div>
        <div className="file-info">
          <div className="file-name" title="Click to view full table">ai_impact_jobs_2010_2025.csv</div>
          <div className="file-meta">{stats.totalRows.toLocaleString()} rows × {stats.columns} columns</div>
        </div>
      </div>

      {/* 增强的列统计 */}
      <div className="detailed-stats-section">
        {/* 添加提示横幅 */}
        <div className="click-hint-banner">
          Hover over each column to see detailed statistics and visualizations! Click the file header to view the full data table.
        </div>
        <div className="section-label">Column Statistics (scroll → hover for details)</div>
        <div className="stats-scroll-container">
          <div className="stats-row">
            {Object.keys(columnStats).map(col => {
              const stat = columnStats[col];
              const isHovered = hoveredColumn === col;
              
              return (
                <div 
                  key={col} 
                  className={`stat-cell ${isHovered ? 'hovered' : ''}`}
                  onMouseEnter={() => {setHoveredColumn(col); setTooltip({
                    x: window.event?.clientX || 0, 
                    y: window.event?.clientY || 0,
                    content: <TooltipContent stat={stat} col={col} />
                  });}}
                  onMouseLeave={() => {setHoveredColumn(null); setTooltip(null);}}
                >
                  <div className="cell-header">
                    <span className="cell-name">{col}</span>
                    <span className={`type-badge ${stat.type}`}>{stat.type}</span>
                  </div>
                  
                  <div className="cell-viz">
                    <EnhancedMiniViz 
                      data={stat} 
                      column={col}
                      isHovered={isHovered}
                    />
                  </div>
                  
                  <div className="cell-footer">
                    {stat.type === 'categorical' && stat.topValues.length > 0 ? (
                      <div className="top-values-preview">
                        {stat.topValues.slice(0, 2).map((v, i) => (
                          <span key={i} className="top-value-tag">
                            {v.value} ({v.percentage}%)
                          </span>
                        ))}
                        {stat.distribution.length > 2 && (
                          <span className="more-tag">+{stat.distribution.length - 2} more</span>
                        )}
                      </div>
                    ) : (
                      <span className="unique-count">{stat.unique.toLocaleString()} unique</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 数据预览表 */}
      <div className="preview-table-container">
        <div className="table-title">Data Preview (first 5 rows)</div>
        <div className="table-scroll-x">
          <table className="preview-table">
            <thead>
              <tr>
                {data.length > 0 && Object.keys(data[0]).map(col => (
                  <th key={col} className={getColumnClass(col)} title={col}>
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

      {/* 增强Tooltip */}
      {tooltip && tooltip.content && (
        <div className="enhanced-tooltip" style={{
          left: Math.min(tooltip.x + 15, window.innerWidth - 250), 
          top: tooltip.y - 10
        }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

// Tooltip内容组件
const TooltipContent = ({ stat, col }) => (
  <div className="tooltip-content">
    <div className="tooltip-header">
      <strong>{col}</strong>
      <span className={`type-tag ${stat.type}`}>{stat.type}</span>
    </div>
    <div className="tooltip-stats">
      <div>Total: {stat.total.toLocaleString()}</div>
      <div>Unique: {stat.unique.toLocaleString()}</div>
      {stat.missing > 0 && <div className="missing">Missing: {stat.missing}</div>}
    </div>
    {stat.type === 'categorical' && stat.distribution.length > 0 && (
      <div className="tooltip-distribution">
        <div className="dist-title">Top values:</div>
        {stat.distribution.slice(0, 5).map((item, i) => (
          <div key={i} className="dist-row">
            <span className="dist-value" title={item.value}>
              {item.value.length > 15 ? item.value.substring(0, 15) + '...' : item.value}
            </span>
            <div className="dist-bar-bg">
              <div className="dist-bar" style={{width: `${item.percentage}%`}}/>
            </div>
            <span className="dist-pct">{item.percentage}%</span>
          </div>
        ))}
        {stat.distribution.length > 5 && (
          <div className="dist-more">...and {stat.distribution.length - 5} more</div>
        )}
      </div>
    )}
    {stat.type === 'numeric' && stat.extent && (
      <div className="tooltip-numeric">
        <div>Range: {stat.extent[0].toFixed(2)} - {stat.extent[1].toFixed(2)}</div>
      </div>
    )}
  </div>
);

const StatCard = ({ title, icon, value, subtitle, children }) => (
  <div className="stat-card">
    <div className="stat-header">
      <span className="stat-icon">{icon}</span>
      <span className="stat-name">{title}</span>
    </div>
    <div className="stat-value-large">{value}</div>
    {subtitle && <div className="stat-detail">{subtitle}</div>}
    {children && <div className="stat-chart">{children}</div>}
  </div>
);

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
          style={{height: `${(item[1] / maxValue * 100)}%`}}
        />
      </div>
    ))}
  </div>
);

const EnhancedMiniViz = ({ data, column, isHovered }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;
    const container = d3.select(containerRef.current);
    container.selectAll("*").remove();

    const width = 85;
    const height = 50;
    
    if (data.type === 'categorical') {
      // 水平条形图显示top values
      const svg = container.append("svg").attr("width", width).attr("height", height);
      const top3 = data.distribution.slice(0, 3);
      const maxCount = top3[0]?.count || 1;
      
      top3.forEach((d, i) => {
        const y = i * 16;
        const barWidth = (d.count / maxCount) * (width - 30);
        
        svg.append("rect")
          .attr("x", 0).attr("y", y + 2)
          .attr("width", barWidth)
          .attr("height", 12)
          .attr("fill", "#0ea5e9")
          .attr("opacity", 0.7);
          
        svg.append("text")
          .attr("x", 2).attr("y", y + 11)
          .attr("font-size", "8px")
          .attr("fill", "white")
          .text(d.value.substring(0, 8));
      });
    } else if (data.type === 'numeric') {
      // 迷你直方图
      const svg = container.append("svg").attr("width", width).attr("height", height);
      const values = data.distribution.map(d => d.count);
      const maxVal = Math.max(...values) || 1;
      const barWidth = (width - 10) / values.length;
      
      values.forEach((count, i) => {
        const h = (count / maxVal) * (height - 10);
        svg.append("rect")
          .attr("x", 5 + i * barWidth)
          .attr("y", height - h)
          .attr("width", barWidth - 1)
          .attr("height", h)
          .attr("fill", "#10b981");
      });
    } else if (data.type === 'temporal') {
      // 时间线点
      const svg = container.append("svg").attr("width", width).attr("height", height);
      const years = data.distribution;
      const maxCount = Math.max(...years.map(d => d.count));
      
      years.forEach((d, i) => {
        svg.append("circle")
          .attr("cx", 5 + (i / (years.length - 1)) * (width - 10))
          .attr("cy", height / 2)
          .attr("r", 2 + (d.count / maxCount) * 4)
          .attr("fill", "#f59e0b")
          .attr("opacity", 0.7);
      });
    } else {
      // 文本类型显示数字
      const svg = container.append("svg").attr("width", width).attr("height", height);
      svg.append("text")
        .attr("x", width/2).attr("y", height/2 + 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", "#64748b")
        .text(data.unique);
    }
  }, [data, isHovered]);

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
