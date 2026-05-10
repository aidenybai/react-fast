const template1 = <div>{simple}</div>;

const template2 = <div>{state.dynamic}</div>;

const template3 = <div>{simple ? good : bad}</div>;

const template4 = <div>{simple ? good() : bad}</div>;

const template5 = <div>{state.dynamic ? good() : bad}</div>;

const template6 = <div>{state.dynamic && good()}</div>;

const template7 = <div>{state.count > 5 ? (state.dynamic ? best : good()) : bad}</div>;

const template8 = <div>{state.dynamic && state.something && good()}</div>;

const template9 = <div>{(state.dynamic && good()) || bad}</div>;

const template10 = <div>{state.a ? "a" : state.b ? "b" : state.c ? "c" : "fallback"}</div>;

const template11 = <div>{state.a ? a() : state.b ? b() : state.c ? "c" : "fallback"}</div>;

const template12 = <div>{state.dynamic ?? fallback()}</div>;

const template13 = <div>{(thing() && thing1()) ?? thing2() ?? thing3()}</div>;

const template14 = <div>{thing() || thing1() || thing2()}</div>;

const template15 = <div>{something?.()}</div>;

const template16 = <div>{something?.something}</div>;

const template17 = <div>{state?.dynamic ? "a" : "b"}</div>;

const template18 = (
  <div>
    {isLoading ? <span>Loading...</span> : <span>{data}</span>}
  </div>
);

const template19 = (
  <div>
    {items.length > 0 && items.map(item => <li key={item.id}>{item.name}</li>)}
  </div>
);

const template20 = (
  <div>
    {status === "success"
      ? <div className="success">{message}</div>
      : status === "error"
        ? <div className="error">{error}</div>
        : <div className="loading">Please wait...</div>}
  </div>
);

function ConditionalComponent({ variant }) {
  return (
    <div>
      {variant === "primary" && <button className="primary">Primary</button>}
      {variant === "secondary" && <button className="secondary">Secondary</button>}
      {!variant && <span>No variant</span>}
    </div>
  );
}
