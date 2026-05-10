const selected = true;
let id = "my-h1";
let link;

const template = (
  <div id="main" {...results} style={{ color }}>
    <h1
      className="base"
      id={id}
      {...results()}
      disabled
      title={welcoming()}
      style={{ "background-color": color(), "margin-right": "40px" }}
    >
      <a href={"/"} ref={link}>
        Welcome
      </a>
    </h1>
  </div>
);

const template2 = (
  <div {...getProps("test")}>
    <div dangerouslySetInnerHTML={{ __html: "<div/>" }} />
  </div>
);

const template3 = (
  <div
    id={state.id}
    className={state.name}
  />
);

const template4 = <div className="hi" className={state.class} />;

const template5 = <div className="a" className="b"></div>;

const template6 = <div style={someStyle()} />;

const template7 = (
  <div
    style={{ "background-color": color(), "margin-right": "40px" }}
  />
);

let refTarget;
const template8 = <div ref={refTarget} />;

const template9 = <div ref={e => console.log(e)} />;

const template10 = <div ref={refFactory()} />;

const template11 = <input type="checkbox" checked={true} />;

const template12 = <input type="checkbox" checked={state.visible} />;

const template13 = <div className="`a">`$`</div>;

const template14 = (
  <button
    className="static"
    type="button"
  >
    Write
  </button>
);

const template15 = (
  <button
    onClick={increment}
  >
    Hi
  </button>
);

const template16 = (
  <div>
    <input value={s()} onInput={doSomething} readOnly="" />
    <input checked={s2()} onInput={doSomethingElse} readOnly={value} />
  </div>
);

const template17 = <div data-info='"hi"' data-other={'"'} />;

const template18 = <div disabled={"t" in test}>{"t" in test && "true"}</div>;

const template19 = <a {...props} something />;

const template20 = (
  <div>
    {props.children}
    <a {...props} something />
  </div>
);

const template21 = (
  <div start="Hi" {...spread}>
    Hi
  </div>
);

const template22 = (
  <div start="Hi" {...first} {...second}>
    Hi
  </div>
);

const template23 = <div attribute={!!someValue}>{!!someValue}</div>;

const template24 = (
  <div
    className="class1 class2 class3"
    style="color: red; background-color: blue;"
  />
);

const template25 = <div style={{ "background-color": getStore.color }} />;

const template26 = <div style={{ "background-color": undefined }} />;

const template27 = <input value={10} />;

const template28 = <div title="<u>data</u>"/>;
