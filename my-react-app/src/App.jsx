import React, { useState, useEffect } from "react";
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

  // 渲染主内容
  const renderMainContent = () => {
    if (showFullTable) {
      return <FullTableView data={fullData} loading={tableLoading} onBack={handleBackToTask} />;
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
      {/* 左侧边栏 */}
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

      {/* 展开/收起按钮 */}
      <div 
        className="toggle-btn" 
        style={{ left: drawerOpen ? "300px" : "0" }}
        onClick={() => setDrawerOpen(!drawerOpen)}
      >
        {drawerOpen ? "◀" : "▶"}
      </div>

      {/* 右侧主内容区 */}
      <main className={`main-content ${drawerOpen ? "drawer-open" : ""}`}>
        {renderMainContent()}
      </main>
    </div>
  );
}

// 完整表格视图
const FullTableView = ({ data, loading, onBack }) => {
  if (loading) return <div className="full-table-view loading">Loading dataset...</div>;
  
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  
  return (
    <div className="full-table-view">
      <div className="table-toolbar">
        <button onClick={onBack}>← Back to Visualization</button>
        <span>{data.length.toLocaleString()} rows</span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>{columns.map(col => <th key={col}>{col}</th>)}</tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>{columns.map(col => <td key={col} title={row[col]}>{row[col]?.substring(0, 50)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;
