import { useState, useEffect } from "react";

function AnimatedCircle({ cx, cy, radius, color, delay }: { cx: number; cy: number; radius: number; color: string; delay: number }) {
  const [scale, setScale] = useState(1);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let frame: number;
    const animate = () => {
      const time = (Date.now() + delay * 1000) / 1000;
      setScale(1 + Math.sin(time * 2) * 0.2);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [delay]);

  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius * scale}
      fill={hovered ? "#fff" : color}
      stroke={color}
      strokeWidth={2}
      opacity={hovered ? 1 : 0.7}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer", transition: "fill 0.15s" }}
    />
  );
}

function BarChart({ data, width, height }: { data: { label: string; value: number; color: string }[]; width: number; height: number }) {
  const maxValue = Math.max(...data.map((item) => item.value));
  const barWidth = (width - 40) / data.length - 4;
  const chartHeight = height - 40;

  return (
    <svg width={width} height={height} style={{ border: "1px solid #eee", borderRadius: 4 }}>
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * chartHeight;
        const positionX = 20 + index * (barWidth + 4);
        const positionY = chartHeight - barHeight + 10;
        return (
          <g key={item.label}>
            <rect
              x={positionX}
              y={positionY}
              width={barWidth}
              height={barHeight}
              fill={item.color}
              rx={2}
              opacity={0.8}
            />
            <text
              x={positionX + barWidth / 2}
              y={height - 5}
              textAnchor="middle"
              fontSize={9}
              fill="#666"
            >
              {item.label}
            </text>
            <text
              x={positionX + barWidth / 2}
              y={positionY - 4}
              textAnchor="middle"
              fontSize={10}
              fill="#333"
              fontWeight="bold"
            >
              {item.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PieChart({ data, size }: { data: { label: string; value: number; color: string }[]; size: number }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size / 2 - 10;

  let currentAngle = 0;
  const slices = data.map((item) => {
    const sliceAngle = (item.value / total) * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const startX = centerX + Math.cos(startAngle) * outerRadius;
    const startY = centerY + Math.sin(startAngle) * outerRadius;
    const endX = centerX + Math.cos(endAngle) * outerRadius;
    const endY = centerY + Math.sin(endAngle) * outerRadius;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathData = `M ${centerX} ${centerY} L ${startX} ${startY} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endX} ${endY} Z`;

    const labelAngle = startAngle + sliceAngle / 2;
    const labelRadius = outerRadius * 0.65;
    const labelX = centerX + Math.cos(labelAngle) * labelRadius;
    const labelY = centerY + Math.sin(labelAngle) * labelRadius;

    return { ...item, pathData, labelX, labelY };
  });

  return (
    <svg width={size} height={size}>
      {slices.map((slice) => (
        <g key={slice.label}>
          <path d={slice.pathData} fill={slice.color} stroke="#fff" strokeWidth={2} opacity={0.85} />
          {slice.value / total > 0.08 && (
            <text x={slice.labelX} y={slice.labelY} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#fff" fontWeight="bold">
              {Math.round((slice.value / total) * 100)}%
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function SVGDemo() {
  const [circleCount, setCircleCount] = useState(12);
  const [animating, setAnimating] = useState(true);
  const [chartData, setChartData] = useState([
    { label: "Mon", value: 45, color: "#2196f3" },
    { label: "Tue", value: 72, color: "#4caf50" },
    { label: "Wed", value: 58, color: "#ff9800" },
    { label: "Thu", value: 89, color: "#9c27b0" },
    { label: "Fri", value: 63, color: "#f44336" },
    { label: "Sat", value: 34, color: "#00bcd4" },
    { label: "Sun", value: 51, color: "#795548" },
  ]);

  const randomizeData = () => {
    setChartData((prev) => prev.map((item) => ({ ...item, value: Math.floor(Math.random() * 90) + 10 })));
  };

  const circles = Array.from({ length: circleCount }, (_, index) => {
    const angle = (index / circleCount) * Math.PI * 2;
    const radius = 80;
    return {
      cx: 150 + Math.cos(angle) * radius,
      cy: 150 + Math.sin(angle) * radius,
      radius: 10 + (index % 3) * 5,
      color: `hsl(${(index / circleCount) * 360}, 70%, 55%)`,
      delay: index * 0.2,
    };
  });

  return (
    <div>
      <h2 style={{ margin: "0 0 12px" }}>SVG Demo</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
          Circles:
          <input type="range" min={3} max={24} value={circleCount} onChange={(event) => setCircleCount(Number(event.target.value))} />
          {circleCount}
        </label>
        <button onClick={() => setAnimating(!animating)} style={{ padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>
          {animating ? "Pause" : "Resume"}
        </button>
        <button onClick={randomizeData} style={{ padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>
          Randomize Chart
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 13, margin: "0 0 8px" }}>Animated Circles</h3>
          <svg width={300} height={300} style={{ background: "#1a1a2e", borderRadius: 8 }}>
            {animating && circles.map((circle, index) => (
              <AnimatedCircle key={index} {...circle} />
            ))}
            {!animating && circles.map((circle, index) => (
              <circle key={index} cx={circle.cx} cy={circle.cy} r={circle.radius} fill={circle.color} opacity={0.7} />
            ))}
            <circle cx={150} cy={150} r={5} fill="#fff" />
          </svg>
        </div>

        <div>
          <h3 style={{ fontSize: 13, margin: "0 0 8px" }}>Bar Chart</h3>
          <BarChart data={chartData} width={400} height={200} />

          <h3 style={{ fontSize: 13, margin: "16px 0 8px" }}>Pie Chart</h3>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <PieChart data={chartData} size={180} />
            <div style={{ fontSize: 11 }}>
              {chartData.map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
                  <span>{item.label}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
