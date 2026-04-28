import type { ReactNode, Dispatch, SetStateAction } from "react";
import { badgeUrl } from "../utils/paths";
import { DraggablePie } from "../charts/Radar";

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
};

export default function LeftPanel({
  currentDetail,
  description,
  descriptionVisible,
  badges,
  showWeights,
  weights,
  setWeights,
}: LeftPanelProps) {
  return (
    <div className="left-container">
      <div className="detail-card">
        <span className="badge">Current Stage</span>
        <h2>{currentDetail.title}</h2>
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
