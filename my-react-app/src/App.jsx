import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./App.css";
import * as d3 from "d3";
import DataPreview from "./components/DataPreview";
import Task1 from "./page/task1";
import Task2 from "./page/task2";

function App() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activeTask, setActiveTask] = useState('task-1');
  const [showFullTable, setShowFullTable] = useState(false);
  const [fullData, setFullData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  const handleShowFullTable = async () => {
    if (fullData.length > 0) {
      setShowFullTable(true);
      return;
    }
    setTableLoading(true);
    try {
      const data = await d3.csv('/ai_impact_jobs_2010_2025.csv');
      setFullData(data);
      setShowFullTable(true);
    } catch (err) {
      console.error("Failed to load full table:", err);
    } finally {
      setTableLoading(false);
    }
  };

  const handleBackToTask = () => {
    setShowFullTable(false);
  };

  const renderMainContent = () => {
    if (showFullTable) {
      return <DatasetViewer data={fullData} loading={tableLoading} onBack={handleBackToTask} />;
    }
    
    switch(activeTask) {
      case 'task-1': return <Task1 />;
      case 'task-2': return <Task2 />;
      case 'task-3': return <div className="task-placeholder">Task 3: Impact Stats (Coming Soon)</div>;
      case 'task-4': return <div className="task-placeholder">Task 4: Future Prediction (Coming Soon)</div>;
      default: return <Task1 />;
    }
  };

  return (
    <div className="App">
      <aside className={`drawer ${drawerOpen ? "open" : ""}`}>
        <div className="drawer-content">
          <div className="drawer-header">
            <h1>Career-a-Vis AI</h1>
            <p>Navigate the evolving AI landscape through data-driven narratives.</p>
          </div>

          <DataPreview onShowFullTable={handleShowFullTable} />

          <div className="nav-section-title">Navigation</div>
          
          <nav className="task-nav">
            {[
              { id: 'task-1', num: 1, label: 'Regional Globe' },
              { id: 'task-2', num: 2, label: 'Industry Time Machine' },
              { id: 'task-3', num: 3, label: 'Impact Stats' },
              { id: 'task-4', num: 4, label: 'Future Prediction' }
            ].map(task => (
              <button 
                key={task.id}
                className={`nav-btn ${activeTask === task.id && !showFullTable ? 'active' : ''}`}
                onClick={() => {
                  setActiveTask(task.id);
                  setShowFullTable(false);
                }}
              >
                <span className="nav-num">{task.num}</span>
                <span className="nav-label">{task.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div 
        className="toggle-btn" 
        style={{ left: drawerOpen ? "300px" : "0" }}
        onClick={() => setDrawerOpen(!drawerOpen)}
      >
        {drawerOpen ? "◀" : "▶"}
      </div>

      <main className={`main-content ${drawerOpen ? "drawer-open" : ""}`}>
        {renderMainContent()}
      </main>
    </div>
  );
}

// 性能优化：使用虚拟滚动和缓存
const DatasetViewer = ({ data, loading, onBack }) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [hoveredColumn, setHoveredColumn] = useState(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 }); // 只渲染50行

  // 使用Intersection Observer实现虚拟滚动
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const rowHeight = 35; // 每行大约高度
      const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 10);
      const end = Math.min(data.length, start + 100); // 一次渲染100行
      setVisibleRange({ start, end });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [data.length]);

  if (loading) return <div className="dataset-viewer loading">Loading dataset...</div>;
  if (!data || data.length === 0) return <div className="dataset-viewer">No data available</div>;

  const columns = Object.keys(data[0]);
  
  // 缓存列统计计算
  const columnStats = useMemo(() => {
    const stats = {};
    columns.forEach(col => {
      const values = data.map(d => d[col]);
      const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      const uniqueValues = [...new Set(values)];
      
      let type = 'text';
      if (col.includes('year')) type = 'temporal';
      else if (numericValues.length > values.length * 0.8) type = 'numeric';
      else if (uniqueValues.length <= 50) type = 'categorical';
      
      let distribution = [];
      
      // 关键修复：salary_change使用固定范围-5~18，步长2.3
      if (col === 'salary_change_vs_prev_year_percent') {
        const fixedMin = -5;
        const fixedMax = 18;
        const step = 2.3;
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
          percentage: (b.length / values.length * 100)
        }));
        
        stats[col] = {
          type: 'numeric',
          unique: uniqueValues.length,
          total: values.length,
          missing: values.filter(v => !v || v === '').length,
          distribution,
          isFixedRange: true
        };
      }
      else if (type === 'categorical' || type === 'text') {
        const counts = d3.rollup(values, v => v.length, d => d);
        const sorted = Array.from(counts, ([value, count]) => ({
          value: value || '(empty)',
          count,
          percentage: (count / values.length * 100)
        })).sort((a, b) => b.count - a.count);
        
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
        
        stats[col] = { type, unique: uniqueValues.length, total: values.length, missing: values.filter(v => !v || v === '').length, distribution };
      } 
      else if (type === 'numeric') {
        const extent = d3.extent(numericValues);
        const hist = d3.bin().domain(extent).thresholds(10)(numericValues);
        distribution = hist.map(b => ({
          range: `${b.x0.toFixed(1)}-${b.x1.toFixed(1)}`,
          count: b.length,
          percentage: (b.length / values.length * 100)
        }));
        stats[col] = { type, unique: uniqueValues.length, total: values.length, missing: values.filter(v => !v || v === '').length, distribution };
      } 
      else if (type === 'temporal') {
        const counts = d3.rollups(values, v => v.length, d => d).sort((a, b) => d3.ascending(a[0], b[0]));
        distribution = counts.map(([year, count]) => ({
          value: year,
          count,
          percentage: (count / values.length * 100)
        }));
        stats[col] = { type, unique: uniqueValues.length, total: values.length, missing: values.filter(v => !v || v === '').length, distribution };
      }
    });
    return stats;
  }, [data, columns]);

  // 缓存排序数据（只排序一次）
  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    return [...data].sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];
      
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        valA = numA;
        valB = numB;
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  // 只渲染可见行（虚拟滚动）
  const visibleData = useMemo(() => {
    return sortedData.slice(visibleRange.start, visibleRange.end);
  }, [sortedData, visibleRange]);

  const handleSort = useCallback((col) => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  return (
    <div className="dataset-viewer">
      <div className="viewer-header">
        <button className="back-btn" onClick={onBack}>← Back to Visualization</button>
        <div className="dataset-title">ai_impact_jobs_2010_2025.csv</div>
        <div className="dataset-meta">{data.length.toLocaleString()} rows × {columns.length} columns</div>
      </div>

      <div className="viewer-body">
        <div className="left-panel">
          <div className="panel-title">Column Statistics</div>
          <div className="column-list">
            {columns.map(col => {
              const stat = columnStats[col];
              const isHovered = hoveredColumn === col;
              const isSorted = sortColumn === col;
              
              return (
                <div 
                  key={col} 
                  className={`column-stat-item ${isHovered ? 'hovered' : ''} ${isSorted ? 'sorted' : ''}`}
                  onMouseEnter={() => setHoveredColumn(col)}
                  onMouseLeave={() => setHoveredColumn(null)}
                  onClick={() => handleSort(col)}
                >
                  <div className="col-info">
                    <span className="col-name">{col}</span>
                    <span className={`col-type ${stat.type}`}>{stat.type}</span>
                  </div>
                  
                  <div className="col-viz-container">
                    {stat.type === 'categorical' && <Top2OthersChart data={stat.distribution} />}
                    {stat.type === 'temporal' && <BarChart data={stat.distribution} />}
                    {stat.type === 'numeric' && <Histogram data={stat.distribution} isFixedRange={stat.isFixedRange} />}
                    {stat.type === 'text' && <div className="text-stat">{stat.unique} unique</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="right-panel">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="row-num-header">#</th>
                  {columns.map(col => (
                    <th 
                      key={col} 
                      className={sortColumn === col ? 'sorted' : ''}
                      onClick={() => handleSort(col)}
                    >
                      <div className="th-content">
                        <span>{col}</span>
                        {sortColumn === col && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 虚拟滚动：只渲染可见行 */}
                <tr style={{ height: `${visibleRange.start * 35}px` }} />
                {visibleData.map((row, idx) => (
                  <tr key={visibleRange.start + idx} className={hoveredColumn ? 'dimmed' : ''}>
                    <td className="row-number">{visibleRange.start + idx + 1}</td>
                    {columns.map(col => (
                      <td key={col} className={hoveredColumn === col ? 'highlighted' : ''}>
                        {formatCell(row[col], col)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr style={{ height: `${(data.length - visibleRange.end) * 35}px` }} />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const Top2OthersChart = React.memo(({ data }) => {
  if (!data || data.length === 0) return null;
  const colors = ['#0ea5e9', '#10b981', '#cbd5e1'];
  
  return (
    <div className="top2-chart">
      {data.map((item, i) => (
        <div key={i} className="dist-row">
          <div className="dist-label">
            <span className="color-dot" style={{background: colors[i % colors.length]}}></span>
            <span className="label-text" title={item.value}>
              {item.value.length > 12 ? item.value.substring(0, 12) + '...' : item.value}
            </span>
          </div>
          <div className="dist-bar-wrapper">
            <div className="dist-bar" style={{width: `${item.percentage}%`, background: colors[i % colors.length]}} />
          </div>
          <span className="dist-pct">{item.percentage.toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
});

const BarChart = React.memo(({ data }) => {
  if (!data || data.length === 0) return null;
  const maxCount = Math.max(...data.map(d => d.count));
  
  return (
    <div className="year-bars">
      {data.map((d, i) => (
        <div key={i} className="year-bar-item" title={`${d.value}: ${d.count} records`}>
          <div className="year-bar-bg">
            <div className="year-bar-fill" style={{height: `${(d.count / maxCount) * 100}%`}} />
          </div>
          <span className="year-label">{d.value.toString().slice(-2)}</span>
        </div>
      ))}
    </div>
  );
});

const Histogram = React.memo(({ data, isFixedRange }) => {
  if (!data || data.length === 0) return null;
  const maxCount = Math.max(...data.map(d => d.count));
  
  return (
    <div className={`mini-histogram ${isFixedRange ? 'fixed-range' : ''}`}>
      {data.map((bin, i) => (
        <div 
          key={i} 
          className="hist-bar" 
          style={{height: `${(bin.count / maxCount) * 100}%`}}
          title={`${bin.range}: ${bin.count}`}
        />
      ))}
    </div>
  );
});

const formatCell = (val, col) => {
  if (!val) return <span className="null-val">-</span>;
  if (col.includes('salary') && !isNaN(parseFloat(val))) {
    return '$' + parseInt(val).toLocaleString();
  }
  if (col.includes('percent') || col.includes('score')) {
    return parseFloat(val).toFixed(2);
  }
  if (val.length > 25) return val.substring(0, 25) + '...';
  return val;
};

export default App;
