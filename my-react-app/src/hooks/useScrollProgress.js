import { useState, useEffect, useCallback } from 'react';

export const useScrollProgress = () => {
  const [progress, setProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [direction, setDirection] = useState('down');

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const currentProgress = docHeight > 0 ? currentScrollY / docHeight : 0;
    
    setDirection(currentScrollY > scrollY ? 'down' : 'up');
    setScrollY(currentScrollY);
    setProgress(Math.min(1, Math.max(0, currentProgress)));
  }, [scrollY]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return { progress, scrollY, direction };
};

export default useScrollProgress;
