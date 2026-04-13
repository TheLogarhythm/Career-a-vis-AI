import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import DataPreview from '../components/DataPreview/DataPreview';
import { useScrolly } from '../context/ScrollyContext';
import './SectionDataset.css';

const SectionDataset = () => {
  const { prefetchDatasetB } = useScrolly();

  // 进入此Section时预加载数据集B
  useEffect(() => {
    prefetchDatasetB();
  }, [prefetchDatasetB]);

  return (
    <div className="section-dataset">
      <motion.div 
        className="dataset-header"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2>Dataset Overview</h2>
        <p className="dataset-intro">
          Our analysis is built on comprehensive job market data spanning 
          15 years across multiple industries and regions.
        </p>
      </motion.div>

      <motion.div 
        className="dataset-content"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        viewport={{ once: true }}
      >
        <DataPreview />
      </motion.div>

      <motion.div 
        className="dataset-transition-hint"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        viewport={{ once: true }}
      >
        <p>Continue scrolling to explore the analysis tasks →</p>
      </motion.div>
    </div>
  );
};

export default SectionDataset;
