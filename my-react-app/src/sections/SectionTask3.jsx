import React from 'react';
import TaskPlaceholder from '../components/Common/TaskPlaceholder';
import './SectionTask.css';

const SectionTask3 = () => {
  return (
    <div className="section-task">
      <div className="task-header">
        <span className="task-number">Task 3</span>
        <h3>Impact Stats</h3>
        <p className="task-desc">Detailed impact analysis</p>
      </div>
      <div className="task-content-wrapper">
        <TaskPlaceholder 
          taskNumber={3}
          title="Impact Stats"
          icon="\uD83D\uDCCA"
          description="Visualization coming soon"
        />
      </div>
    </div>
  );
};

export default SectionTask3;
