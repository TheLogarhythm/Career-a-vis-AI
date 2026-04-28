import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./TransitionSection.css";

export default function TransitionSection({ scrollParentRef, imageSrc, title, description }) {
  const bandRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const container = scrollParentRef?.current;
    if (!container) return;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const handle = () => {
      const band = bandRef.current;
      const img = imgRef.current;
      if (!band || !img) return;

      const bandRect = band.getBoundingClientRect();
      const viewportH = container.clientHeight;
      const totalTravel = viewportH + bandRect.height;
      const traveled = viewportH - bandRect.top;

      // progress: 0 = band far below viewport, 1 = band far above viewport
      const progress = Math.max(0, Math.min(1, traveled / totalTravel));

      // Visibility: fade in → stay visible → fade out
      let visibility;
      if (progress < 0.2) {
        visibility = progress / 0.2; // 0 → 1
      } else if (progress < 0.6) {
        visibility = 1; // fully visible
      } else {
        visibility = Math.max(0, 1 - (progress - 0.6) / 0.4); // 1 → 0
      }

      // Slide-in animation
      let tx, bgx;
      if (progress < 0.3) {
        const t = easeOutCubic(progress / 0.3);
        tx = 350 * (1 - t);
        bgx = 0;
      } else {
        const t = easeOutCubic((progress - 0.3) / 0.7);
        tx = Math.min(t * 50, 50);
        bgx = t * 30;
      }

      img.style.opacity = visibility;
      img.style.transform = `translateX(${tx}px)`;
      img.style.backgroundPositionX = `calc(100% - ${bgx}px)`;
    };

    container.addEventListener("scroll", handle, { passive: true });
    handle();
    return () => container.removeEventListener("scroll", handle);
  }, [scrollParentRef]);

  return (
    <>
      <div className="ts-band" ref={bandRef}>
        <div className="ts-content">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {/* Portal renders the image outside the scroll container → position:fixed works reliably */}
      {createPortal(
        <div className="ts-image" ref={imgRef} style={{ backgroundImage: `url('${imageSrc}')` }} />,
        document.body,
      )}
    </>
  );
}
