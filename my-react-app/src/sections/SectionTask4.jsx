import React, { useEffect, useState } from 'react';
import { useScrolly } from '../context/ScrollyContext';
import TaskPlaceholder from '../components/Common/TaskPlaceholder';
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

  if (datasetB.status === 'loading') {
    return (
      <div className="section-task">
        <div className="task-header">
          <span className="task-number">Task 4</span>
          <h3>Future Prediction</h3>
          <p className="task-desc">AI-powered future projections</p>
        </div>
        <div className="task-content-wrapper">
          <TaskPlaceholder 
            taskNumber={4}
            title="Future Prediction"
            icon="\uD83D\uDD2E"
            description="Loading dataset..."
            status="loading"
          />
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
      <div className="task-content-wrapper">
        <TaskPlaceholder 
          taskNumber={4}
          title="Future Prediction"
          icon="\uD83D\uDD2E"
          description={data ? "Dataset loaded - visualization coming soon" : "Waiting for data"}
        />
      </div>
    </div>
  );
};

export default SectionTask4;
