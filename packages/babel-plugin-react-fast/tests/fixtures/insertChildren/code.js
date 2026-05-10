const children = <div />;
const dynamic = { children };

const template = <Module children={children} />;

const template2 = <module children={children} />;

const template3 = <module children={children}>Hello</module>;

const template4 = (
  <module children={children}>
    <Hello />
  </module>
);

const template5 = <module children={dynamic.children} />;

const template6 = <Module children={dynamic.children} />;

const template7 = <module {...dynamic} />;

const template8 = <module {...dynamic}>Hello</module>;

const template9 = <module {...dynamic}>{dynamic.children}</module>;

const template10 = <Module {...dynamic}>Hello</Module>;

const template11 = <module>{children()}</module>;

const template12 = <Module>{children()}</Module>;

const template13 = <module>{state.children()}</module>;

const template14 = <Module>{state.children()}</Module>;

const tiles = [];
tiles.push(<div>Test 1</div>);
const template15 = <div>{tiles}</div>;

const template16 = <div>{expression(), "static"}</div>;

const template17 = <div>{children()()}</div>;

function ListComponent({ items }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={item.id} className={index % 2 === 0 ? "even" : "odd"}>
          <span>{item.name}</span>
          <button onClick={() => remove(item.id)}>X</button>
        </li>
      ))}
    </ul>
  );
}

function NestedInserts({ data }) {
  return (
    <div>
      <header>{data.title}</header>
      <main>
        {data.sections.map(section => (
          <section>
            <h2>{section.heading}</h2>
            {section.items.map(item => <p>{item}</p>)}
          </section>
        ))}
      </main>
      <footer>{data.footer}</footer>
    </div>
  );
}
