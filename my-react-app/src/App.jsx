import React from "react";
import "./App.css";
import IndustryIntensityChart from "./elements/industryIntensityChart.jsx";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <div className="container">
          <h1>Data Visualization Project</h1>
          <p className="subtitle">
            COMP4462: Data Visualization, HKUST, Spring 2026
          </p>
        </div>
      </header>

      <main className="container">
        <section id="overview">
          <h2>Project Overview</h2>
          <p>
            Data visualization project for COMP4462: Data Visualization at HKUST,
            Spring 2026.
          </p>
          <p>
            <strong>Status:</strong> In Progress (Expected completion: May 2026)
          </p>
        </section>

        <section id="objectives">
          <h2>Objectives</h2>
          <p>
            Creating interactive and insightful visualizations to explore and
            communicate complex data patterns.
          </p>
        </section>

        <section id="visualization">
          <h2>AI Impact on Industries</h2>
          
          <IndustryIntensityChart />
          
        </section>

        <section id="technologies">
          <h2>Technologies Used</h2>
          <ul>
            <li>D3.js / JavaScript</li>
            <li>Web technologies (HTML, CSS, JavaScript)</li>
          </ul>
        </section>
      </main>

      <footer>
        <div className="container">
          <p>&copy; 2026 Career-a-vis-AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;