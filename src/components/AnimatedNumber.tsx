"use client";

import { useState, useEffect } from "react";
import { formatRupiah } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  formatter?: (n: number) => string;
  duration?: number;
}

export default function AnimatedNumber({
  value,
  formatter = formatRupiah,
  duration = 600,
}: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayed(0);
      return;
    }

    const start = displayed;
    const diff = value - start;
    const startTime = performance.now();
    let raf: number;

    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + diff * ease));
      if (progress < 1) raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <>{formatter(displayed)}</>;
}
