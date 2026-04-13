import React, { createContext, useContext, useState, useCallback } from 'react';

const ScrollyContext = createContext();

export const ScrollyProvider = ({ children }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [taskProgress, setTaskProgress] = useState([false, false, false, false]);
  // datasetB holds loading status, data and potential error to support consumers
  const [datasetB, setDatasetB] = useState({ status: 'idle', data: null, error: null });
  // backward-compatible simple status string for small components
  const datasetBStatus = datasetB.status;
  const [robotPosition, setRobotPosition] = useState({ x: null, y: null });
  
  // 预加载数据集B
  const loadDatasetB = useCallback(async (url) => {
    // 返回数据对象以便组件可直接使用
    setDatasetB(prev => ({ ...prev, status: 'loading', error: null }));
    try {
      // 如需替换为真实 fetch，请将下面的模拟替换为 fetch(url)
      // const res = await fetch(url);
      // const json = await res.json();
      await new Promise(resolve => setTimeout(resolve, 800)); // 模拟延迟
      const json = { example: true, items: [] };
      setDatasetB({ status: 'success', data: json, error: null });
      return json;
    } catch (error) {
      setDatasetB({ status: 'error', data: null, error });
      throw error;
    }
  }, []);

  const prefetchDatasetB = useCallback(async () => {
    if (datasetB.status !== 'idle') return;
    try {
      await loadDatasetB('/api/dataset-b');
    } catch (e) {
      // ignore here; loadDatasetB already set error state
    }
  }, [datasetB.status, loadDatasetB]);

  const markTaskComplete = useCallback((taskIndex) => {
    setTaskProgress(prev => {
      const newProgress = [...prev];
      newProgress[taskIndex] = true;
      return newProgress;
    });
  }, []);

  const value = {
    currentSection,
    setCurrentSection,
    taskProgress,
    markTaskComplete,
    datasetB,
    loadDatasetB,
    datasetBStatus,
    prefetchDatasetB,
    robotPosition,
    setRobotPosition,
  };

  return (
    <ScrollyContext.Provider value={value}>
      {children}
    </ScrollyContext.Provider>
  );
};

export const useScrolly = () => {
  const context = useContext(ScrollyContext);
  if (!context) throw new Error('useScrolly must be used within ScrollyProvider');
  return context;
};
