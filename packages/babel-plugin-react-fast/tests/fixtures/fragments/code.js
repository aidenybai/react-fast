const multiStatic = (
  <>
    <div>First</div>
    <div>Last</div>
  </>
);

const multiExpression = (
  <>
    <div>First</div>
    {inserted}
    <div>Last</div>
    After
  </>
);

const multiDynamic = (
  <>
    <div id={state.first}>First</div>
    {state.inserted}
    <div id={state.last}>Last</div>
    After
  </>
);

const singleExpression = <>{inserted}</>;

const singleDynamic = <>{inserted()}</>;

const firstStatic = (
  <>
    {inserted}
    <div />
  </>
);

const firstDynamic = (
  <>
    {inserted()}
    <div />
  </>
);

const firstComponent = (
  <>
    <Component />
    <div />
  </>
);

const lastStatic = (
  <>
    <div />
    {inserted}
  </>
);

const lastDynamic = (
  <>
    <div />
    {inserted()}
  </>
);

const lastComponent = (
  <>
    <div />
    <Component />
  </>
);

const spaces = (
  <>
    <span>1</span> <span>2</span> <span>3</span>
  </>
);

const multiLineTrailing = (
  <>
    <span>1</span>
    <span>2</span>
    <span>3</span>
  </>
);

const nestedFragments = (
  <>
    <>
      <div>Inner 1</div>
      <div>Inner 2</div>
    </>
    <div>Outer</div>
  </>
);

const fragmentWithConditional = (
  <>
    {show && <div>Shown</div>}
    <span>Always</span>
  </>
);

function FragmentComponent({ items }) {
  return (
    <>
      <h1>Title</h1>
      {items.map((item) => (
        <>
          <dt>{item.term}</dt>
          <dd>{item.definition}</dd>
        </>
      ))}
    </>
  );
}
