const Child = props => {
  const [s, set] = createSignal();
  return <>
    <div ref={props.ref}>Hello {props.name}</div>
    <div ref={set}>{props.children}</div>
  </>
};

const template = props => {
  let childRef;
  const { content } = props;
  return (
    <div>
      <Child name="John" {...props} ref={childRef}>
        <div>From Parent</div>
      </Child>
      <Child name="Jason" ref={props.ref}>
        <div>{content}</div>
      </Child>
      <Context.Consumer ref={props.consumerRef()}>{context => context}</Context.Consumer>
    </div>
  );
};

const template2 = (
  <Child
    name="Jake"
    dynamic={state.data}
    handleClick={clickHandler}
    hyphen-ated={state.data}
    ref={el => (e = el)}
  />
);

const template3 = (
  <Child>
    <div />
    <div />
    <div />
    After
  </Child>
);

const [s, set] = createSignal();
const template4 = <Child ref={set}>{<div />}</Child>;

const template5 = <Child dynamic={state.dynamic}>{state.dynamic}</Child>;

const template6 = (
  <For each={state.list} fallback={<Loading />}>
    {item => <Show when={state.condition}>{item}</Show>}
  </For>
);

const template7 = (
  <Child>
    <div />
    {state.dynamic}
  </Child>
);

const template8 = (
  <Child>
    {item => item}
    {item => item}
  </Child>
);

const template9 = (
  <div>
    <Link>new</Link>
    {" | "}
    <Link>comments</Link>
    {" | "}
    <Link>show</Link>
    {" | "}
    <Link>ask</Link>
  </div>
);

const template10 = (
  <div>
    <Link>new</Link>
    {" | "}
    <Link>comments</Link>
    <Link>show</Link>
    {" | "}
    <Link>ask</Link>
  </div>
);

class Template11 {
  render() {
    <Component prop={this.something} onClick={() => this.shouldStay}>
      <Nested prop={this.data}>{this.content}</Nested>
    </Component>;
  }
}

const Template12 = <Component>{data()}</Component>;

const Template13 = <Component {...props}/>;

const Template14 = <Component something={something} {...props}/>;

const Template15 = <Component class={prop.red ? "red" : "green"} />;

const template16 = <Component passObject={{ ...a }} />;

const template17 = <Component disabled={"t" in test}>{"t" in test && "true"}</Component>;

function RealWorldComponent({ user, onLogout }) {
  return (
    <div className="header">
      <Avatar src={user.avatar} size="large" />
      <UserInfo name={user.name} email={user.email}>
        <Badge type={user.role} />
      </UserInfo>
      <Button onClick={onLogout} variant="outline">
        Logout
      </Button>
    </div>
  );
}

function CompositionPattern({ render, fallback, children }) {
  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={<Skeleton />}>
        {typeof render === "function" ? render() : children}
      </Suspense>
    </ErrorBoundary>
  );
}
