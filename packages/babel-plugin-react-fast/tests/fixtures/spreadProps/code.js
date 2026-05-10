const template = <div {...props} />;

const template2 = <div {...props} className="extra" />;

const template3 = <div className="base" {...props} />;

const template4 = <div {...first} {...second} />;

const template5 = <div className="base" {...first} id="main" {...second} title={dynamic} />;

const template6 = (
  <div {...getProps("test")}>
    <span {...innerProps}>text</span>
  </div>
);

const template7 = (
  <input
    type="text"
    {...inputProps}
    value={value}
    onChange={handleChange}
    className={`input ${error ? "error" : ""}`}
  />
);

const template8 = (
  <button
    {...buttonProps}
    disabled={isLoading}
    onClick={handleClick}
    style={{ ...baseStyle, ...overrideStyle }}
  >
    {isLoading ? "Loading..." : label}
  </button>
);

function SpreadComponent({ variant, size, ...rest }) {
  return (
    <div className={`card card-${variant} card-${size}`} {...rest}>
      <div className="card-body" {...rest.bodyProps}>
        {rest.children}
      </div>
    </div>
  );
}

function ForwardedComponent(props) {
  const { className, style, children, ...domProps } = props;
  return (
    <div className={className} style={style} {...domProps}>
      {children}
    </div>
  );
}
