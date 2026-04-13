import React, { useEffect, useState } from 'react';
import { useScrolly } from '../context/ScrollyContext';
import './SectionTask.css';

const SectionTask4 = () => {
  const { datasetB, loadDatasetB } = useScrolly();
  const [data, setData] = useState(null);

  useEffect(() => {
    // 如果数据集B已预加载，使用它
    if (datasetB.status === 'success' && datasetB.data) {
      setData(datasetB.data);
    } else if (datasetB.status === 'error') {
      // 如果预加载失败，尝试重新加载
      loadDatasetB('/api/dataset-b').then(setData);
    }
  }, [datasetB, loadDatasetB]);

  if (datasetB.status === 'loading' || !data) {
    return (
      <div className="section-task">
        <div className="task-loading">
          <div className="loading-spinner"></div>
          <p>Loading Dataset B...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-task">
      <div className="task-header">
        <span className="task-number">Task 4</span>
        <h3>Future Prediction</h3>
        <p className="task-desc">AI-powered future projections</p>
      </div>
      <div className="task-content-wrapper task-placeholder">
        <div className="placeholder-content">
          <div className="placeholder-icon">🔮</div>
          <h4>Task 4: Future Prediction</h4>
          <p>Dataset B Loaded: {data ? '✓' : '✗'}</p>
        </div>
      </div>
    </div>
  );
};

export default SectionTask4;
