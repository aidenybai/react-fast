import { useState, useEffect } from "react";

const targetSize = 25;

function Dot({ x, y, s, text }: { x: number; y: number; s: number; text: string }) {
  const [hover, setHover] = useState(false);

  const st: React.CSSProperties = {
    position: "absolute",
    textAlign: "center",
    cursor: "pointer",
    width: s * 1.3 + "px",
    height: s * 1.3 + "px",
    left: x + "px",
    top: y + "px",
    borderRadius: (s * 1.3) / 2 + "px",
    lineHeight: s * 1.3 + "px",
    background: hover ? "#ff0" : "#61dafb",
    fontSize: s / 2.5 + "px",
    transition: "background 0.12s",
  };

  return (
    <div style={st} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {hover ? `*${text}*` : text}
    </div>
  );
}

function Triangle({ x, y, s, seconds }: { x: number; y: number; s: number; seconds: number }) {
  if (s <= targetSize) {
    return (
      <Dot x={x - targetSize / 2} y={y - targetSize / 2} s={targetSize} text={String(seconds)} />
    );
  }
  s = s / 2;
  return (
    <>
      <Triangle x={x} y={y - s / 2} s={s} seconds={seconds} />
      <Triangle x={x - s} y={y + s / 2} s={s} seconds={seconds} />
      <Triangle x={x + s} y={y + s / 2} s={s} seconds={seconds} />
    </>
  );
}

export function SierpinskiOptimized() {
  const [seconds, setSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [t, setT] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s % 10) + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let running = true;
    let last = performance.now();
    const tick = () => {
      if (!running) return;
      const now = performance.now();
      setElapsed(now - last);
      setT((prev) => prev + (now - last) / 1000);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      running = false;
    };
  }, []);

  const scale = 1 + (Math.sin(t * 1.5) + 1) * 0.08;
  const transform = `scaleX(${(Math.sin(t * 0.8) / 2.5).toFixed(3)}) scaleY(0.7) translateZ(0.1px)`;

  return (
    <div>
      <div style={{ fontSize: 12, marginBottom: 8, fontFamily: "monospace" }}>
        Frame: {elapsed.toFixed(1)}ms | {(1000 / Math.max(elapsed, 1)).toFixed(0)} fps
      </div>
      <div
        style={{
          position: "relative",
          width: 600,
          height: 520,
          transform,
          transformOrigin: "50% 50%",
        }}
      >
        <Triangle x={300} y={50} s={400 * scale} seconds={seconds} />
      </div>
    </div>
  );
}
