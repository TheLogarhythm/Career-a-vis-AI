import { useState, useCallback } from 'react';

export const useDatasetLoader = () => {
  const [datasetA, setDatasetA] = useState({
    status: 'idle', // 'idle' | 'loading' | 'success' | 'error'
    data: null,
    error: null,
  });
  
  const [datasetB, setDatasetB] = useState({
    status: 'idle',
    data: null,
    error: null,
  });

  // 加载数据集A (立即加载)
  const loadDatasetA = useCallback(async (url) => {
    setDatasetA(prev => ({ ...prev, status: 'loading' }));
    try {
      const response = await fetch(url);
      const data = await response.json(); // 或 csv解析
      setDatasetA({ status: 'success', data, error: null });
      return data;
    } catch (error) {
      setDatasetA({ status: 'error', data: null, error });
      throw error;
    }
  }, []);

  // 预加载数据集B (懒加载)
  const prefetchDatasetB = useCallback(async (url) => {
    if (datasetB.status !== 'idle') return;
    
    setDatasetB(prev => ({ ...prev, status: 'loading' }));
    try {
      const response = await fetch(url);
      const data = await response.json();
      setDatasetB({ status: 'success', data, error: null });
    } catch (error) {
      setDatasetB({ status: 'error', data: null, error });
    }
  }, [datasetB.status]);

  // 强制加载数据集B (如果预加载失败，用户手动触发)
  const loadDatasetB = useCallback(async (url) => {
    setDatasetB(prev => ({ ...prev, status: 'loading' }));
    try {
      const response = await fetch(url);
      const data = await response.json();
      setDatasetB({ status: 'success', data, error: null });
      return data;
    } catch (error) {
      setDatasetB({ status: 'error', data: null, error });
      throw error;
    }
  }, []);

  return {
    datasetA,
    datasetB,
    loadDatasetA,
    prefetchDatasetB,
    loadDatasetB,
  };
};

export default useDatasetLoader;
