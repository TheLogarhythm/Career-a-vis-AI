import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

import Introduction from "./page/introduction";
import Task1 from "./page/task1";
import Task2 from "./page/task2";
import Task3 from "./page/task3";
import Task4 from "./page/task4";

/* ───────────────────────────────────────────
   Section metadata – order matters
   ─────────────────────────────────────────── */
const SECTIONS = [
  { id: "intro", icon: "📖", label: "Intro",       title: "Job Guide",                            summary: "An interactive exploration of AI's impact on the global job market from 2010 to 2025." },
  { id: "task1", icon: "🌍", label: "Location",    title: "AI Job Global Market",                 summary: "Explore how AI jobs are distributed across countries and regions on an interactive globe." },
  { id: "task2", icon: "📈", label: "Time",        title: "Industry Trends Over Time",            summary: "Compare how different industries have evolved in salary, AI intensity, automation risk and job count." },
  { id: "task3", icon: "💬", label: "Topics",      title: "AI Impact Analysis",                   summary: "Dive into seniority breakdowns and line-chart explorations of the dataset." },
  { id: "task4", icon: "🔮", label: "Prediction",  title: "Future Outlook",                       summary: "Predictive models and forecasts for AI's impact on the job market." },
];

/* ───────────────────────────────────────────
   Soft-lock config
   ─────────────────────────────────────────── */
const SOFT_LOCK_MS   = 500;   // how long the scroll is "damped" at a boundary
const LOCK_THRESHOLD = 60;    // px of overscroll needed to break through

function App() {
  const scrollRef      = useRef(null);          // right-side scroll container
  const sectionRefs    = useRef({});            // refs for each section wrapper
  const [activeTask, setActiveTask] = useState("task1");

  /* ── Soft-lock state (not in React state to avoid re-renders) ── */
  const lockRef = useRef({ locked: false, timer: null, accumulated: 0 });

  /* ── Register a section ref ── */
  const setSectionRef = useCallback((id) => (el) => {
    if (el) sectionRefs.current[id] = el;
  }, []);

  /* ────────────────────────────────────────
     Scroll-based detection – find which
     section's top is closest to the viewport
     top (works for sections of any height)
     ──────────────────────────────────────── */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => {
      const scrollTop = container.scrollTop;
      const viewH = container.clientHeight;
      let bestId = SECTIONS[0].id;
      let bestDist = Infinity;

      SECTIONS.forEach(({ id }) => {
        const el = sectionRefs.current[id];
        if (!el) return;
        // Distance from section top to the scroll viewport top
        // A section "owns" the viewport when its top has scrolled past
        // but its bottom hasn't yet
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        // Section is relevant if any part is visible
        if (top < scrollTop + viewH && bottom > scrollTop) {
          // Prefer the section whose top is closest to (but ≤) scrollTop + small offset
          const dist = Math.abs(top - scrollTop);
          if (top <= scrollTop + viewH * 0.4 && dist < bestDist) {
            bestDist = dist;
            bestId = id;
          }
        }
      });

      setActiveTask((prev) => (prev !== bestId ? bestId : prev));
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initial check
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  /* ────────────────────────────────────────
     Soft-lock: dampen scrolling at section
     boundaries so users don't accidentally
     fly into the next task
     ──────────────────────────────────────── */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onWheel = (e) => {
      const lock = lockRef.current;

      // If we're currently locked, accumulate delta and block scroll
      if (lock.locked) {
        lock.accumulated += Math.abs(e.deltaY);
        if (lock.accumulated > LOCK_THRESHOLD) {
          // User pushed hard enough — release
          clearTimeout(lock.timer);
          lock.locked = false;
          lock.accumulated = 0;
        } else {
          e.preventDefault();
        }
        return;
      }

      // Detect if we're at a section boundary
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 2;
      const atTop    = scrollTop <= 2;

      const scrollingDown = e.deltaY > 0;
      const scrollingUp   = e.deltaY < 0;

      if ((atBottom && scrollingDown) || (atTop && scrollingUp)) {
        // Don't lock at the very top of the page when scrolling up
        // or at the very bottom when scrolling down (global edges).
        // We only care about internal section boundaries.
        // But since each section is 100vh, hitting the global bottom/top
        // IS a section boundary — so we lock briefly.
      }

      // Check if we're near a snap point between sections
      const sectionIds = SECTIONS.map(s => s.id);
      for (const id of sectionIds) {
        const el = sectionRefs.current[id];
        if (!el) continue;
        const elTop    = el.offsetTop;
        const elBottom = elTop + el.offsetHeight;
        const viewBottom = scrollTop + clientHeight;

        // Near the bottom edge of a section (about to leave it)
        const nearBottomEdge = Math.abs(viewBottom - elBottom) < 10 && scrollingDown;
        // Near the top edge of a section (about to leave upward)
        const nearTopEdge = Math.abs(scrollTop - elTop) < 10 && scrollingUp && elTop > 0;

        if (nearBottomEdge || nearTopEdge) {
          e.preventDefault();
          lock.locked = true;
          lock.accumulated = Math.abs(e.deltaY);
          lock.timer = setTimeout(() => {
            lock.locked = false;
            lock.accumulated = 0;
          }, SOFT_LOCK_MS);
          return;
        }
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  /* ── Find the active section metadata ── */
  const active = SECTIONS.find((s) => s.id === activeTask) || SECTIONS[0];

  /* ── Left-panel click → smooth-scroll right side ── */
  const scrollToSection = (id) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="app-shell">
      {/* ======== LEFT PANEL ======== */}
      <aside className="left-panel" key={active.id}>
        {/* Top branding */}
        <div className="left-panel-header">
          <h1 className="brand-title">Career-a-Vis AI</h1>
          <p className="brand-sub">Navigate the evolving AI landscape</p>
        </div>

        {/* Active section card */}
        <div className="active-section-card">
          <span className="section-icon">{active.icon}</span>
          <h2 className="section-title">{active.title}</h2>
          <p className="section-summary">{active.summary}</p>
        </div>

        {/* Mini nav dots */}
        <nav className="section-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`nav-dot ${s.id === activeTask ? "active" : ""}`}
              onClick={() => scrollToSection(s.id)}
              title={s.label}
            >
              <span className="nav-dot-icon">{s.icon}</span>
              <span className="nav-dot-label">{s.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ======== RIGHT SCROLLABLE MAIN ======== */}
      <main className="right-scroll" ref={scrollRef}>
        <section
          className="scroll-section"
          data-section="intro"
          ref={setSectionRef("intro")}
        >
          <Introduction scrollParentRef={scrollRef} />
        </section>

        <section
          className="scroll-section"
          data-section="task1"
          ref={setSectionRef("task1")}
        >
          <Task1 />
        </section>

        <section
          className="scroll-section"
          data-section="task2"
          ref={setSectionRef("task2")}
        >
          <Task2 />
        </section>

        <section
          className="scroll-section"
          data-section="task3"
          ref={setSectionRef("task3")}
        >
          <Task3 scrollParentRef={scrollRef} />
        </section>

        <section
          className="scroll-section"
          data-section="task4"
          ref={setSectionRef("task4")}
        >
          <Task4 />
        </section>
      </main>
    </div>
  );
}

export default App;
