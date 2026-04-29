import type { ReactNode, Dispatch, SetStateAction } from "react";
import { badgeUrl } from "../utils/paths";
import { DraggablePie } from "../charts/Radar";
import * as d3 from "d3";

export type TaskDetail = {
  title: ReactNode;
  description: ReactNode;
};

type LeftPanelProps = {
  currentDetail: TaskDetail;
  description: ReactNode;
  descriptionVisible: boolean;
  badges: string[];
  showWeights: boolean;
  weights: Record<string, number>;
  setWeights: Dispatch<SetStateAction<Record<string, number>>>;
  selectedIndustry: string;
  setSelectedIndustry: (val: string) => void;
  industries: string[];
  comparisonIndustry: string;
  setComparisonIndustry: (val: string) => void;
  activeTask: string;
};

export default function LeftPanel({
  currentDetail,
  description,
  descriptionVisible,
  badges,
  showWeights,
  weights,
  setWeights,
  industries,
  selectedIndustry,
  setSelectedIndustry,
  comparisonIndustry,
  setComparisonIndustry,
  activeTask
}: LeftPanelProps) {
  return (
    <div className="left-container">
      <div className="detail-card">
        <span className="badge">Current Stage</span>
        <h2>{currentDetail.title}</h2>


        {activeTask === "section2" && (
  <div style={{ marginTop: "20px", marginBottom: "20px" }}>
    <h4 style={{ fontSize: "12px", color: "#64748b", marginBottom: "10px" }}>
      Select Industry
    </h4>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {industries.map((ind) => {
        // SAFETY CHECK: If selectedIndustry is undefined, this will be false instead of crashing
        const isSelected = selectedIndustry && selectedIndustry === ind;

        return (
          <button 
            key={ind}
            onClick={() => setSelectedIndustry(ind)}
            style={{
              padding: "6px 12px",
              fontSize: "11px",
              borderRadius: "16px",
              cursor: "pointer",
              transition: "all 0.2s",
              
              // BASE STYLE: White background
              background: "white", 
              
              // SELECTED STYLE: Border and Text turn Blue
              // UNSELECTED STYLE: Border is light grey, Text is muted grey
              border: isSelected ? "2px solid #3498db" : "2px solid #e2e8f0",
              color: isSelected ? "#3498db" : "#64748b",
              
              fontWeight: isSelected ? "600" : "400",
              outline: "none"
            }}
          >
            {ind}
          </button>
        );
      })}
    </div>
  </div>
)}



        <div
          className={`description ${descriptionVisible ? "fade-in" : "fade-out"}`}
          style={{ whiteSpace: "pre-wrap" }}
        >
          {description}
          {showWeights && (
            <div style={{ marginTop: "24px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
              <DraggablePie weights={weights} setWeights={setWeights} />
            </div>
          )}
        </div>
        {badges.length > 0 && (
          <div className="visualization-badges" aria-label="Visualization badges">
            {badges.map((fileName) => (
              <img
                key={fileName}
                src={badgeUrl(fileName)}
                alt={fileName.replace(/[_-]/g, " ")}
                className="vis-badge"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
