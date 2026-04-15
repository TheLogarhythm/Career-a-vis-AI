import React from 'react';
import { motion } from 'framer-motion';
import '../../sections/SectionTask.css';

const TaskPlaceholder = ({
  taskNumber,
  title,
  icon,
  description = 'Coming Soon',
  status = 'placeholder' // placeholder | loading | error
}) => {
  const statusConfig = {
    placeholder: { icon: icon || '\uD83D\uDEA7', color: '#94a3b8' },
    loading: { icon: '\u23F3', color: '#0ea5e9' },
    error: { icon: '\u26A0\uFE0F', color: '#ef4444' }
  };

  const config = statusConfig[status];

  return (
    <motion.div
      className="task-placeholder"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9',
        height: '100%',
        width: '100%'
      }}
    >
      <div className="placeholder-content">
        <motion.div
          className="placeholder-icon"
          animate={{
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          {config.icon}
        </motion.div>
        <h4>Task {taskNumber}: {title}</h4>
        <p style={{ color: config.color }}>{description}</p>

        {status === 'loading' && (
          <div className="loading-spinner" style={{ marginTop: '1rem' }} />
        )}
      </div>
    </motion.div>
  );
};

export default TaskPlaceholder;
