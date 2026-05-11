const template = (
  <svg width="400" height="180">
    <rect
      strokeWidth="2"
      x="50"
      y="20"
      rx="20"
      ry="20"
      width="150"
      height="150"
      style="fill:red;stroke:black;stroke-width:5;opacity:0.5"
    />
    <linearGradient gradientTransform="rotate(25)">
      <stop offset="0%"></stop>
    </linearGradient>
  </svg>
);

const template2 = (
  <svg width="400" height="180">
    <rect
      className={state.name}
      strokeWidth={state.width}
      x={state.x}
      y={state.y}
      rx="20"
      ry="20"
      width="150"
      height="150"
      style={{
        fill: "red",
        stroke: "black",
        "stroke-width": props.stroke,
        opacity: 0.5,
      }}
    />
  </svg>
);

const template3 = (
  <svg width="400" height="180">
    <rect {...props} />
  </svg>
);

const template4 = <rect x="50" y="20" width="150" height="150" />;

const template5 = (
  <>
    <rect x="50" y="20" width="150" height="150" />
  </>
);

const template6 = (
  <svg viewBox={"0 0 160 40"} xmlns="http://www.w3.org/2000/svg">
    <a xlinkHref={url}>
      <text x="10" y="25">
        MDN Web Docs
      </text>
    </a>
  </svg>
);

const template7 = (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx={cx} cy={cy} r={radius} fill={color} stroke={stroke} strokeWidth={strokeWidth} />
  </svg>
);

const template8 = (
  <svg>
    <path
      d={pathData}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function AnimatedSVG({ progress }) {
  return (
    <svg width="200" height="200" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="90" fill="none" stroke="#e0e0e0" strokeWidth="10" />
      <circle
        cx="100"
        cy="100"
        r="90"
        fill="none"
        stroke="#4caf50"
        strokeWidth="10"
        strokeDasharray={`${progress * 565.48} 565.48`}
        strokeLinecap="round"
        transform="rotate(-90 100 100)"
      />
      <text x="100" y="100" textAnchor="middle" dominantBaseline="central" fontSize="24">
        {Math.round(progress * 100)}%
      </text>
    </svg>
  );
}
