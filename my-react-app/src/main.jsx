import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// 全局注册 gsap 的 ScrollTrigger，确保所有组件在使用时插件已注册
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
try {
  gsap.registerPlugin(ScrollTrigger);
} catch (e) {
  // 在极少数情况下重复注册会抛错，捕获以避免页面崩溃
  // console.warn('ScrollTrigger register failed or already registered', e);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
