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
            
            if (rightContainerRef.current) {
              rightContainerRef.current.scrollTop = 0;
            }
          }
        });
      },
      { threshold: 0.8 } // Trigger when card is 80% visible
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
        <div style={{ height: "40vh" }} />
      </div>

      <div className="right-container" ref={rightContainerRef}>
        <div className="content-padding">
          {renderRightContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
