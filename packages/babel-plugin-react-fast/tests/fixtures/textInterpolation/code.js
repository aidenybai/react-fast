const trailing = <span>Hello </span>;
const leading = <span> John</span>;

const extraSpaces = <span>Hello John</span>;

const trailingExpr = <span>Hello {name}</span>;
const leadingExpr = <span>{greeting} John</span>;

const multiExpr = (
  <span>
    {greeting} {name}
  </span>
);

const multiExprSpaced = (
  <span>
    {" "}
    {greeting} {name}{" "}
  </span>
);

const multiExprTogether = (
  <span>
    {" "}
    {greeting}
    {name}{" "}
  </span>
);

const multiLine = <span>Hello</span>;

const multiLineTrailingSpace = <span>Hello John</span>;

const multiLineNoTrailingSpace = <span>Hello John</span>;

const injection = <span>Hi{"<script>alert();</script>"}</span>;

let value = "World";
const evaluated = <span>Hello {value + "!"}</span>;

let number = 4 + 5;
const evaluatedNonString = <span>4 + 5 = {number}</span>;

const newLineLiteral = (
  <div>
    {s}
    {"\n"}d
  </div>
);

const trailingSpace = <div>{expr}</div>;

const leadingSpaceElement = <span> {expr}</span>;

const trailingSpaceElement = <span>{expr} </span>;

const lastElementExpression = (
  <div>
    <div></div>
    {expr()}
  </div>
);

const multipleTextNodes = (
  <p>
    Start {middle} end {last} final
  </p>
);

const nestedDynamic = (
  <div>
    <span>{a}</span>
    <span>{b}</span>
    <span>{c}</span>
  </div>
);

const emptyExpression = <div>{/* comment */}</div>;

const numericChild = <span>{42}</span>;

const templateLiteralChild = <span>{`Hello ${name}`}</span>;
