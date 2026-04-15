import React, { useRef, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { useScrolly } from '../../context/ScrollyContext';
import './DraggableRobot.css';

const SECTIONS = [
  { id: 0, label: 'Background', icon: '🏠' },
  { id: 1, label: 'Dataset', icon: '📊' },
  { id: 2, label: 'Task 1', icon: '🌍' },
  { id: 3, label: 'Task 2', icon: '⏱️' },
  { id: 4, label: 'Task 3', icon: '📈' },
  { id: 5, label: 'Task 4', icon: '🔮' },
  { id: 6, label: 'Conclusion', icon: '✨' },
];

const DraggableRobot = () => {
  const { 
    currentSection, 
    setCurrentSection,
    taskProgress, 
    datasetBStatus,
    robotPosition,
    setRobotPosition 
  } = useScrolly();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const controls = useDragControls();
  const robotRef = useRef(null);

  // 点击导航
  const handleNavigate = (sectionId) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setCurrentSection(sectionId);
      // 重新播放进入动画
      const event = new CustomEvent('replaySection', { detail: { sectionId } });
      window.dispatchEvent(event);
    }
    setIsExpanded(false);
  };

  // 获取机器人状态颜色
  const getStatusColor = () => {
    if (datasetBStatus === 'error') return '#ef4444'; // 红色：加载失败
    if (datasetBStatus === 'loading') return '#f59e0b'; // 黄色：加载中
    if (datasetBStatus === 'success') return '#10b981'; // 绿色：已加载
    return '#0ea5e9'; // 蓝色：默认
  };

  // 保存位置
  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    setRobotPosition({ x: info.point.x, y: info.point.y });
  };

  return (
    <>
      {/* 机器人主体 */}
      <motion.div
        ref={robotRef}
        drag
        dragControls={controls}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        initial={{ x: robotPosition.x || window.innerWidth - 100, y: robotPosition.y || window.innerHeight - 100 }}
        className={`robot-navigator ${isExpanded ? 'expanded' : ''}`}
        style={{
          position: 'fixed',
          zIndex: 9999,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* 机器人图标 */}
        <div 
          className="robot-body"
          onClick={() => !isDragging && setIsExpanded(!isExpanded)}
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: `0 4px 20px ${getStatusColor()}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            position: 'relative',
          }}
        >
          🤖
          
          {/* 状态指示灯 */}
          <div 
            className="status-light"
            style={{
              position: 'absolute',
              top: 5,
              right: 5,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: getStatusColor(),
              boxShadow: `0 0 10px ${getStatusColor()}`,
              animation: datasetBStatus === 'loading' ? 'pulse 1s infinite' : 'none',
            }}
          />
          
          {/* 进度环 */}
          <svg className="progress-ring" style={{ position: 'absolute', top: -5, left: -5, width: 70, height: 70 }}>
            <circle
              cx="35"
              cy="35"
              r="32"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="3"
            />
            <circle
              cx="35"
              cy="35"
              r="32"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(currentSection / 6) * 201} 201`}
              transform="rotate(-90 35 35)"
              style={{ transition: 'stroke-dasharray 0.3s ease' }}
            />
          </svg>
        </div>

        {/* 展开的菜单 */}
        {isExpanded && (
          <motion.div 
            className="robot-menu"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            style={{
              position: 'absolute',
              bottom: 70,
              right: 0,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
              padding: 12,
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              minWidth: 180,
            }}
          >
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                className={`menu-item ${currentSection === section.id ? 'active' : ''}`}
                onClick={() => handleNavigate(section.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: currentSection === section.id ? '#e0f2fe' : 'transparent',
                  color: currentSection === section.id ? '#0ea5e9' : '#475569',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontSize: 14,
                  transition: 'all 0.2s',
                }}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
                {section.id >= 2 && section.id <= 5 && taskProgress[section.id - 2] && (
                  <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓</span>
                )}
              </button>
            ))}
            
            {/* 数据集B状态提示 */}
            {datasetBStatus === 'error' && (
              <div style={{ 
                marginTop: 8, 
                padding: 8, 
                background: '#fef2f2', 
                borderRadius: 6, 
                fontSize: 12, 
                color: '#dc2626' 
              }}>
                ⚠️ Dataset B failed to load
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </>
  );
};

export default DraggableRobot;
