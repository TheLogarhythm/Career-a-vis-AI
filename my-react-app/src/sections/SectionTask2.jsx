import React, { useEffect, useState } from 'react';
import Task2 from '../page/task2';
import { useScrolly } from '../context/ScrollyContext';
import './SectionTask.css';

const SectionTask2 = () => {
  const { markTaskComplete } = useScrolly();
  const [key, setKey] = useState(0); // 用于强制重新渲染

  useEffect(() => {
    // 监听重新播放事件
    const handleReplay = (e) => {
      if (e.detail.sectionId === 3) {
        setKey(prev => prev + 1); // 强制重新渲染Task2
      }
    };
    
    window.addEventListener('replaySection', handleReplay);
    return () => window.removeEventListener('replaySection', handleReplay);
  }, []);

  useEffect(() => {
    // 监听Task2完成事件（当用户完成所有引导步骤）
    const handleTaskComplete = () => {
      markTaskComplete(1);
    };
    
    window.addEventListener('task2-complete', handleTaskComplete);
    return () => window.removeEventListener('task2-complete', handleTaskComplete);
  }, [markTaskComplete]);

  return (
    <div className="section-task">
      <div className="task-header">
        <span className="task-number">Task 2</span>
        <h3>Industry Time Machine</h3>
        <p className="task-desc">Explore industry trends over time</p>
      </div>
      <div className="task-content-wrapper task2-wrapper">
        <Task2 key={key} />
      </div>
    </div>
  );
};

export default SectionTask2;
