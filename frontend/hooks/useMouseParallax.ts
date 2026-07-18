"use client";

import { useEffect, useMemo, useState } from "react";

export interface ParallaxOffset {
  x: number;
  y: number;
}

export function useMouseParallax(intensity = 0.015) {
  const [offset, setOffset] = useState<ParallaxOffset>({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setOffset({ x: x * intensity * 100, y: y * intensity * 100 });
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [intensity]);

  return useMemo(
    () => ({ x: offset.x, y: offset.y }),
    [offset.x, offset.y]
  );
}
