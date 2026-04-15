import React from "react";
import "./task4.css";

function Task4() {
  return (
    <div className="task4-container">
      <div className="task4-content">
        <div className="task4-header">
          <h2>Prediction Models</h2>
          <p>Forecasting future AI impact on job markets</p>
        </div>
        
        <div className="task4-placeholder">
          <div className="placeholder-icon">🔮</div>
          <h3>Coming Soon</h3>
          <p>
            Advanced prediction models are being developed to forecast:
          </p>
          <ul className="feature-list">
            <li>
              <span className="feature-icon">📈</span>
              <span>Future AI adoption trends across industries</span>
            </li>
            <li>
              <span className="feature-icon">⚠️</span>
              <span>Job displacement risk projections</span>
            </li>
            <li>
              <span className="feature-icon">💡</span>
              <span>Emerging skill requirements</span>
            </li>
            <li>
              <span className="feature-icon">🎯</span>
              <span>Career transition recommendations</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Task4;
