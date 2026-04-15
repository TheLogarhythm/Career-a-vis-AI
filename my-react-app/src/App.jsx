// import React, { useState } from "react";
// import "./App.css";

// import Task1 from "./page/task1";
// import Task2 from "./page/task2";
// import Task3 from "./page/task3";
// import Task4 from "./page/task4";
// import SummaryStats from "./components/SummaryStats";

// function App() {
//   const [drawerOpen, setDrawerOpen] = useState(true);
//   const [selectedTask, setSelectedTask] = useState("task1");

//   const scrollToTask = (id) => {
//     const el = document.getElementById(id);
//     if (el) {
//       el.scrollIntoView({ behavior: "smooth" });
//     }
//   };

//   const renderTask = () => {
//     switch (selectedTask) {
//       case "task1":
//         return <Task1 />;
//       case "task2":
//         return <Task2 />;
//       case "task3":
//         return <Task3 />;
//       case "task4":
//         return <Task4 />;
//       default:
//         return <Task1 />;
//     }
//   };

//   const renderTitle = () => {
//     switch (selectedTask) {
//       case "task1":
//         return "AI Job Global Market";
//       case "task2":
//         return "AI Impact on Job Market over time";
//       case "task3":
//         return "Explore different graphs and insights";
//       case "task4":
//         return "AI Impact on Job Market in the future";
//       default:
//         return "AI Job Global Market";
//     }
//   };

//   const renderSummary = () => {
//     switch (selectedTask) {
//       case "task1":
//         return "Summary of AI Job Global Market";
//       case "task2":
//         return "Summary of AI Impact on Job Market over time";
//       case "task3":
//         return "Chooose different graphs and insights to explore";
//       case "task4":
//         return "Future predictions of AI Impact on Job Market";
//       default:
//         return "Summary of AI Job Global Market";
//     }
//   };

//   return (
//     <div className="App" style={{ "--drawer-width": drawerOpen ? "280px" : "0px" }}>
//       <div className="layout">
//         <div className={`drawer ${drawerOpen ? "open" : ""}`}>
//           <div className="drawer-content">
//             <div className="title">Career-a-Vis AI</div>
//             <div className="summary">Navigate the evolving AI landscape through data-driven narratives.</div>
//             <button className="nav-btn" onClick={() => scrollToTask("task-1")}>
//               1. Regional Globe
//             </button>
//             <button className="nav-btn" onClick={() => scrollToTask("task-2")}>
//               2. Industry Map
//             </button>
//             <button className="nav-btn" onClick={() => scrollToTask("task-3")}>
//               3. Impact Stats
//             </button>
//             <button className="nav-btn" onClick={() => scrollToTask("task-4")}>
//               4. Future Prediction
//             </button>
//           </div>
//           <div className={`drawer ${drawerOpen ? "open" : ""}`}>
//             <div className="title">{renderTitle()}</div>
//             <div className="summary">{renderSummary()}</div>
//             <SummaryStats selectedTask={selectedTask} />

//             {/* Navigation Icons Grid */}
//             <div className="nav-grid">
//               <div
//                 className={`nav-card ${selectedTask === "task1" ? "active" : ""}`}
//                 onClick={() => setSelectedTask("task1")}
//               >
//                 <div className="nav-icon">🌍</div>
//                 <div className="nav-label">Location</div>
//               </div>

//               <div
//                 className={`nav-card ${selectedTask === "task2" ? "active" : ""}`}
//                 onClick={() => setSelectedTask("task2")}
//               >
//                 <div className="nav-icon">📈</div>
//                 <div className="nav-label">Time</div>
//               </div>

//               <div
//                 className={`nav-card ${selectedTask === "task3" ? "active" : ""}`}
//                 onClick={() => setSelectedTask("task3")}
//               >
//                 <div className="nav-icon">💬</div>
//                 <div className="nav-label">Topics</div>
//               </div>

//               <div
//                 className={`nav-card ${selectedTask === "task4" ? "active" : ""}`}
//                 onClick={() => setSelectedTask("task4")}
//               >
//                 <div className="nav-icon">🔮</div>
//                 <div className="nav-label">Prediction</div>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div
//           className="triangle-toggle"
//           style={{ left: drawerOpen ? "280px" : "0" }}
//           onClick={() => setDrawerOpen(!drawerOpen)}
//         >
//           {drawerOpen ? "◀" : "▶"}
//         </div>

//         <div className="content">{renderTask()}</div>
//       </div>
//     </div>
//   );
// }

// export default App;


import Task1 from "./page/task1";
import Task2 from "./page/task2";
import Task3 from "./page/task3";
import Task4 from "./page/task4";
import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [activeTask, setActiveTask] = useState("task1");
  const rightContainerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const taskId = entry.target.getAttribute("data-task");
            setActiveTask(taskId);
            
            // Optional: Reset right side scroll to top when task changes
            if (rightContainerRef.current) {
              rightContainerRef.current.scrollTop = 0;
            }
          }
        });
      },
      { threshold: 0.6 } // Trigger when card is 60% visible
    );

    const cards = document.querySelectorAll(".task-card");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  const renderRightContent = () => {
    switch (activeTask) {
      case "task1": return <Task1 />;
      case "task2": return <Task2 />;
      case "task3": return  <Task3 scrollParentRef={rightContainerRef} />;
      case "task4": return <Task4 />;
      default: return <Task1 />;
    }
  };

  return (
    <div className="web-container">
      {/* LEFT: NAVIGATION SCROLL */}
      <div className="left-container">
        <div className="task-card" data-task="task1" data-active={activeTask === "task1"}>
          <h3>🌍 Location</h3>
          <p>Task 1 Navigation</p>
        </div>
        <div className="task-card" data-task="task2" data-active={activeTask === "task2"}>
          <h3>📈 Time</h3>
          <p>Task 2 Navigation</p>
        </div>
        <div className="task-card" data-task="task3" data-active={activeTask === "task3"}>
          <h3>💬 Topics</h3>
          <p>Task 3 Navigation</p>
        </div>
        <div className="task-card" data-task="task4" data-active={activeTask === "task4"}>
          <h3>🔮 Prediction</h3>
          <p>Task 4 Navigation</p>
        </div>
        {/* Extra space at bottom so last card can scroll to center */}
        <div style={{ height: "40vh" }} />
      </div>

      {/* RIGHT: DETAIL SCROLL */}
      <div className="right-container" ref={rightContainerRef}>
        <div className="content-padding">
          {renderRightContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
