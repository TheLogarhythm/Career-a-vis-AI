import React, { useEffect } from 'react';
import Task1 from '../page/task1';
import { useScrolly } from '../context/ScrollyContext';
import './SectionTask.css';

const SectionTask1 = () => {
  const { markTaskComplete } = useScrolly();

  useEffect(() => {
    // 监听Task1完成事件
    const handleTaskComplete = () => {
      markTaskComplete(0);
    };
    
    window.addEventListener('task1-complete', handleTaskComplete);
    return () => window.removeEventListener('task1-complete', handleTaskComplete);
  }, [markTaskComplete]);

  return (
    <div className="section-task">
      <div className="task-header">
        <span className="task-number">Task 1</span>
        <h3>Regional Globe</h3>
        <p className="task-desc">AI Impact Footprint across the globe</p>
      </div>
      <div className="task-content-wrapper">
        <Task1 />
      </div>
    </div>
  );
};

export default SectionTask1;
