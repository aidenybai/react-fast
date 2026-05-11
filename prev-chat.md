Babel plugin transforms JSX into:

// Input

  <div class="card">
    <h2>{title()}</h2>
    <p>{body()}</p>
  </div>

// Output
const \_tmpl$ = template(`<div class="card"><h2> </h2><p> </p></div>`);
const el = \_tmpl$(); // cloneNode(true) — one DOM op for entire tree
const h2 = el.firstChild; // walk to dynamic nodes
const p = h2.nextSibling;
effect(() => h2.firstChild.data = title()); // direct DOM mutation
effect(() => p.firstChild.data = body());
return el;

No VDOM. template() creates a <template> element with innerHTML once, then clones it. Dynamic parts are patched via
firstChild/nextSibling navigation + direct property assignment.

The react-fast version

Take any React component, compile its JSX the same way, but keep React hooks as the reactive system:

// User writes normal React
function Card({ title, body }) {
const [count, setCount] = useState(0);
return (

<div className="card">
<h2>{title}</h2>
<p>{body}</p>
<span>{count}</span>
<button onClick={() => setCount(c => c + 1)}>+</button>
</div>
);
}

// Compiled output
const \_tmpl$ = template(`<div class="card"><h2> </h2><p> </p><span> </span><button>+</button></div>`);
function Card({ title, body }) {
const [count, setCount] = useState(0);
const \_refs = useRef(null);
const \_el = useMemo(() => {
const root = \_tmpl$();
      const h2 = root.firstChild;
      const p = h2.nextSibling;
      const span = p.nextSibling;
      const btn = span.nextSibling;
      btn.$$click = () => setCount(c => c + 1);
\_refs.current = { h2: h2.firstChild, p: p.firstChild, span: span.firstChild };
return root;
}, []);
// Direct DOM patches — runs every render but no VDOM work
const r = \_refs.current;
if (r) {
r.h2.data = title;
r.p.data = body;
r.span.data = String(count);
}
return \_el; // stable ref → React skips reconciliation
}

What happens on update

1. setCount(1) → React re-renders Card (calls the function)
2. Hooks run normally, count is now 1
3. Three direct DOM assignments: r.span.data = "1" etc.
4. Returns same \_el reference → React sees no change, skips entire reconciliation + commit

Cost per update: function call + hooks + N direct DOM assignments. That's it. No createElement, no VDOM diff, no DOM diff.

Cost of initial render: one cloneNode(true) instead of N createElement + appendChild calls. For 50 DOM nodes that's a
massive win.

What this needs

1. Babel/SWC plugin — replaces the JSX transform. Similar to dom-expressions' plugin but targeting React output patterns
   (useMemo, useRef, stable returns)
2. Tiny runtime (~150 lines) — template(), delegateEvents(), insert(), setAttribute() helpers (mostly copy from
   dom-expressions)
3. Nothing else — hooks work as-is, React components inside are left as createElement calls, context works, refs work

The interesting edge cases

• React components inside: <MyComponent /> stays as createElement(MyComponent, props) — React handles it normally, the
compiled code inserts it into the right slot via insert()
• Conditionals: {show && <div>...</div>} becomes an insert() call with a function expression
• Lists: {items.map(...)} becomes an insert() with array reconciliation (dom-expressions already has this)
• Event handlers: delegated events (click, input, etc.) via $$click on the DOM node, just like Solid

Does this need bippy?

Not for the core path. This is a compiler approach. But bippy could be useful for a dev mode that validates the compiled
output matches what React would have produced, or for profiling the gains.

This is basically Solid's compilation model running inside React's component model. React provides the reactive system
(hooks). The compiler provides the DOM operations. They never fight each other because React never sees the DOM inside
these components.

Want me to plan this out for implementation?

help me braintorm out more compelx edge cases and shit, SSR, etc. go check out ~/Developer/same for a real react
app

⬢ 1 agent completed
Explore ~/Developer/same React app
✓ Done
ctrl+o to expand

There's no same directory at ~/Developer/. The projects there are:

• bippy
• expect
• react-doctor-metrics
• react-fast
• react-grab

Did you mean one of those? Or does it need to be cloned first?

In the meantime, let me lay out the hard edge cases and SSR questions anyway — these are the things that would break a
naive JSX-to-DOM compiler:

Hard edge cases

Conditional rendering:

// Simple — compiler wraps in insert() with a function
{show && <div>content</div>}
{isError ? <Error /> : <Success />}
// Hard — conditional changes DOM structure
{variant === 'a' ? <h1>{title}</h1> : <h2>{title}</h2>}
// Template can't be shared — different root elements

Dynamic children / fragments:

// The parent doesn't know how many children at compile time

  <div>{children}</div>
  // children is opaque — could be anything, can't template it
  // Fragments with mixed static/dynamic
  <>
    <Header />
    {items.map(i => <Card key={i.id} {...i} />)}
    <Footer />
  </>

Refs:

// User expects ref to point to the DOM node

  <div ref={myRef}>{content}</div>
  // With dom-expressions this works naturally — _el IS the DOM node
  // Actually easier than React's current model

Portals:

// createPortal renders into a different DOM container
{createPortal(<Modal />, document.body)}
// Compiler needs to detect this and leave it as-is

Spread props:

// Can't statically analyze which attributes are set

  <div {...props} />
  // dom-expressions handles this with spread() runtime helper
  // but it's slower — can't inline attribute setting

Higher-order patterns / render props:

<Tooltip render={(pos) => <div style={{top: pos.y}}>{label}</div>} />
// The inner JSX is a callback — compiler can still transform it
// but it's created lazily, not at component top level

CSS-in-JS / style objects:

  <div style={{ color: isActive ? 'red' : 'blue', transform: `translateX(${x}px)` }} />
  // Need runtime style() helper that diffs object keys

SSR — the big question

This is where it gets genuinely hard. Three scenarios:

1. Client-only (no SSR)
   No problem. template() + cloneNode works perfectly. Ship it.

2. SSR with hydration (Next.js pages router, Remix)
   Server renders HTML string. Client must hydrate — attach event listeners and set up reactivity without re-creating the DOM.

dom-expressions handles this: instead of cloneNode, the hydration path walks the existing server-rendered DOM and picks up
the nodes. The getNextElement() function does this.

For react-fast: the server would need to render the same HTML that the template produces. This means the server path needs
to generate the same HTML strings. This is doable — the compiler generates both a client bundle (template + cloneNode) and
a server bundle (string concatenation).

3. React Server Components (Next.js app router)
   RSCs render on the server and stream serialized component trees to the client. The client-side React hydrates and takes
   over.

This is the hardest case because RSCs expect React elements, not raw DOM. react-fast compiled components return DOM nodes,
not React elements. They'd need to be client components ("use client"), and RSCs above them would work normally.

The honest assessment of difficulty

┌─────────────────────────┬────────────┬────────────────────────────────────────────┐
│ Edge case │ Difficulty │ Notes │
├─────────────────────────┼────────────┼────────────────────────────────────────────┤
│ Static HTML elements │ Easy │ Core path, template + clone │
│ Dynamic text/attributes │ Easy │ Direct DOM assignment │
│ Event handlers │ Easy │ Delegation or direct │
│ Refs │ Easy │ Actually simpler — direct DOM ref │
│ Conditionals │ Medium │ insert() with function, marker nodes │
│ Lists/map │ Medium │ Array reconciliation needed │
│ Spread props │ Medium │ Runtime spread() helper │
│ React components inside │ Medium │ Leave as createElement, insert() │
│ children prop │ Medium │ Opaque, must use insert() │
│ Portals │ Easy │ Leave as createPortal │
│ Context │ Easy │ Hooks still work, no change │
│ Suspense │ Hard │ Expects React elements for fallback │
│ Error boundaries │ Hard │ Class component, expects React tree │
│ CSS-in-JS libraries │ Hard │ styled-components etc. expect React │
│ SSR hydration │ Hard │ Need matching server HTML + hydration walk │
│ React Server Components │ Medium │ Must be client components │
└─────────────────────────┴────────────┴────────────────────────────────────────────┘

Point me to the right codebase and I can map these edge cases to real patterns in your app.

~/Projects/ami, ~/Projects/same

⬢ 2 agents completed
Explore ~/Projects/ami React app
✓ Done
Explore ~/Projects/same React app
✓ Done
ctrl+o to expand

OK, this is great. Both are large production apps with React 19 + React Compiler already enabled. Let me synthesize the
real edge cases.

What the compiler CAN handle (the win)

Looking at both apps, the actual rendering-heavy paths are leaf-level HTML elements:

Ami's chat messages — each message is a <div> tree with text, margins, opacity. Rendered 100s of times in a reversed column
with contentVisibility: auto. The HTML structure is static, the values (text content, opacity, margins) are dynamic. This
is the sweet spot for template cloning + direct DOM patching.

Same's tool invocations — each case in the 20+ switch renders a different component, but inside those components are static
HTML trees with dynamic values. Same story.

Both apps' UI primitives — the shadcn/ui <Button>, <Card>, <Dialog> etc. all eventually render HTML elements with dynamic
classes and text.

What the compiler CANNOT handle (must bail out)

From the real patterns in these apps:

1. Dynamic component types

// same: tool-invocation/index.tsx
const Wrapper = isLast ? motion.div : "div";
<Wrapper {...(isLast ? animProps : {})} />

Element type unknown at compile time. Must leave as createElement.

2. Imperatively constructed element arrays

// same: messages/index.tsx
const allMessages: Array<ReactElement> = [];
for (let i = 0; i < messages.length; i++) {
// conditional push to different arrays, folding logic
(nonFold ? allMessages : nonTextMessages).push(<div>...</div>);
}

Static analysis can't follow which array gets which elements. The individual <div> inside the push CAN be compiled, but the
array assembly stays as-is.

3. Class components

// both apps: error-boundary.tsx
class ErrorBoundary extends React.Component {
static getDerivedStateFromError() { ... }
render() { return this.props.children; }
}

Lifecycle methods, this.props — can't compile. Leave as-is.

4. Framer Motion / AnimatePresence

// ami: fly-to-context-overlay.tsx
<AnimatePresence>
{animations.map((a) => <FlyToContextBadge key={a.id} animation={a} />)}
</AnimatePresence>

motion.div is a React component that intercepts mount/unmount. Can't template it. But the HTML INSIDE FlyToContextBadge can
be compiled.

5. React.Activity (offscreen)

// ami: chat.tsx
<Activity mode={isActive ? "visible" : "hidden"}>
<ChatPanel />
</Activity>

React concurrent primitive. Leave entirely to React.

6. Singleton stores that trigger renders from outside React

// same: modal.tsx
class ModalManager {
addModal() { this.listeners.forEach(l => l(this.modals)); }
}

External subscription pattern — the React component subscribes via useSyncExternalStore or effect. The compiler doesn't
need to handle this — hooks still work, it's only the JSX output that changes.

The real SSR story

Both apps are Next.js App Router with this pattern:
• Root layout = RSC (server-rendered, streams HTML)
• Everything interactive = "use client" (hydrated on client)
• Many components use dynamic(() => import(...), { ssr: false }) to skip SSR entirely

This means for react-fast:

Server path: The compiler generates a string-concatenation version for SSR. Instead of template() + cloneNode, it's just
template literal concatenation:

// Client
const \_tmpl$ = template(`<div class="card"><h2> </h2></div>`);
const el = \_tmpl$(); // cloneNode
  // Server
  return `<div class="card"><h2>${escapeHtml(title)}</h2></div>`;

Hydration path: Instead of cloning a template, walk the existing server-rendered DOM to find matching nodes:

// Client hydration (instead of cloneNode)
const el = getNextElement(); // finds the server-rendered <div class="card">
const h2 = el.firstChild; // already exists in DOM
// Just attach effects, don't create any DOM

dom-expressions already has this solved with getNextElement() / getNextMarker().

RSC components: Untouched. react-fast only compiles "use client" components.

ssr: false components: No hydration needed — just template() + cloneNode on the client.

The React Compiler question

Both apps have reactCompiler: true. This means React is already auto-memoizing. But React Compiler still goes through the
full React pipeline when values change — createElement, reconcile, diff DOM, commit. react-fast skips all of that.

They're complementary: React Compiler prevents unnecessary re-renders. react-fast makes the re-renders that DO happen
cheaper.

Compiler strategy: gradual, bail-out-friendly

JSX element
├── HTML tag (div, span, etc.)
│ ├── Static props only → inline into template string
│ ├── Dynamic props → template + effect/direct patch
│ ├── Spread props → runtime spread() helper
│ └── dangerouslySetInnerHTML → leave as-is
├── React component (<MyComponent />) → createElement (unchanged)
├── Dynamic type (variable) → createElement (unchanged)
├── Fragment → compile children individually
└── Portal → leave as-is

The compiler only touches what it can prove is static structure. Everything else falls back to regular React. There's no
"all or nothing" — a single component can have compiled HTML and regular React components mixed together.

What would this actually save in these apps?

Looking at Ami's ChatItem (23 props, deeply nested HTML) and Same's tool invocation blocks — these are components with
20-50 DOM nodes that render hundreds of times. Per item, you'd save:
• ~20-50 createElement calls → 1 cloneNode
• ~20-50 fiber reconciliation steps → 3-5 direct DOM assignments
• All of React's commit phase diffing for that subtree

For a chat with 200 messages, that's potentially 4,000-10,000 fewer createElement calls and fiber reconciliations per
render cycle.

Want me to turn this into an implementation plan?

go deeply think about other edge cases, super super super deeply

Let me think through every layer of edge cases — from the subtle runtime semantics to the fundamental architectural
challenges.

1. The Fundamental "Who Owns the DOM" Problem

This is the deepest issue. React expects to own the DOM. The compiled component bypasses React's DOM management. This
creates conflicts in several places:

Returning DOM nodes vs React elements. React components must return React elements, not DOM nodes. So the compiled
component can't just return \_tmpl$(). The architecture must be:
• Outer element = real React element (so React can track it)
• Inner content = template-cloned, managed by us
• Or: let React render first, then take over updates (the bippy approach)

Both approaches have tradeoffs. The first adds a wrapper element (breaks CSS flex/grid children). The second doesn't
optimize first render.

DOM patching during aborted renders. This is critical. React concurrent mode can ABORT renders (transitions, Suspense). If
we patch DOM in the render body, and React aborts that render, we've made mutations React doesn't know about. DOM patching
MUST happen in useLayoutEffect, never in the render body.

Render phase: function body runs — can be aborted
Commit phase: useLayoutEffect runs — never aborted
↑ DOM patching MUST go here

2. React's onChange is NOT the DOM's change event

This is a classic gotcha. React's onChange on <input> fires on every keystroke. The native DOM change event fires on blur.
React internally uses the input event.

If the compiler delegates onChange to the native change event, every controlled input in the app breaks silently. The
compiler must map:
• onChange on <input>, <textarea> → native input event
• onChange on <select> → native change event (this one matches)
• onDoubleClick → dblclick
• onFocus/onBlur → focusin/focusout (for bubbling/delegation)

3. Controlled inputs are deceptively hard

<input value={state} onChange={e => setState(e.target.value)} />

React's reconciler sets input.value = state on every commit. This is what makes controlled inputs work — user types "abc",
React sets value back to whatever state is. If state didn't update, the input reverts.

The compiler must replicate this exactly. And the timing matters: input.value must be set AFTER the browser processes the
keystroke but BEFORE the browser paints. That means useLayoutEffect.

But there's a deeper problem: setting input.value programmatically moves the cursor to the end. React has special handling
to preserve cursor position. The compiler would need the same logic or users see cursor-jumping on every keystroke.

4. Hydration event replay

React's SSR hydration has event replay: if a user clicks a button before hydration completes, React queues the event and
replays it after hydration. This relies on React's synthetic event system.

If the compiler uses custom event delegation ($$click pattern instead of React's events), event replay breaks. Users click
a button on a server-rendered page, nothing happens, and the event is lost.

For SSR components, the compiler should use React's event system, not custom delegation. For ssr: false components (common
in both apps), this doesn't matter.

5. {0 && <Component />} renders "0"

React renders numbers. So {0 && <Component />} evaluates to 0, and React renders the text "0". This is a common React
gotcha.

The compiler's insert() function must match this behavior exactly: numbers → render as text, null/undefined/true/false →
render nothing, 0 → render "0".

6. StrictMode double-invocation

In development, React.StrictMode renders every component twice and runs effects mount → unmount → mount. If the compiler's
setup code runs twice:
• Template cloned twice, appended twice → duplicate DOM content
• Event listeners attached twice

The setup must be idempotent or properly clean up. useLayoutEffect cleanup must fully tear down the template-cloned content
so the second mount starts fresh.

7. Suspense + compiled components

When a compiled component suspends (child throws a Promise), React unmounts the component and shows the fallback. When
resolved, React re-mounts. The component's DOM refs are now stale — they point to removed DOM nodes.

The re-mount triggers fresh setup (useLayoutEffect runs again with new container). This should work IF the cleanup properly
nulls out all refs so the setup path re-runs from scratch.

But there's a subtler issue: Suspense with streaming SSR. React uses <!--$?--> comment markers in the HTML stream to mark
Suspense boundaries. When the resolved content arrives, React finds these markers and swaps content. If the compiled
component's server output doesn't emit these markers, streaming SSR breaks.

8. React DevTools shows stale data

If the compiled component returns a stable element reference, React's fiber tree has the old element with old props baked
in. React DevTools inspects fibers, so it would show stale children props.

Options:
• In dev mode, don't optimize — run normal React (DevTools accurate, no perf win)
• In prod mode, optimize (DevTools doesn't matter)
• Or: use bippy to patch fiber.memoizedProps so DevTools stays accurate

9. children prop is completely opaque

function Card({ children }) {
return <div className="card">{children}</div>;
}

children could be anything: strings, elements, arrays, functions, null, a portal. The compiler can't template the children
— it must use insert() and let React handle whatever children is.

This means any component that accepts children has a "hole" in its template that falls back to React's rendering. This is
fine but limits the optimization win for wrapper/layout components.

10. Fragments with mixed static and dynamic children

<>

<h1>Static title</h1>
{showBanner && <Banner />}
<div>{dynamicContent}</div>
<Footer />
</>

Fragments have no wrapper element. The compiler needs marker comments in the DOM to track where dynamic insertions go.
dom-expressions uses <!> comment nodes as markers. But these markers show up in the HTML and could affect CSS selectors
(:first-child, :nth-child, etc.).

11. useLayoutEffect ordering between compiler and user code

function AutosizeTextarea({ value }) {
const ref = useRef(null);
useLayoutEffect(() => {
// Reads DOM measurement
ref.current.style.height = ref.current.scrollHeight + 'px';
});
return <textarea ref={ref} value={value} />;
}

The compiler's DOM patching (setting textarea.value) must happen BEFORE the user's useLayoutEffect (which reads
scrollHeight). If patching happens after, the measurement uses the old value.

useLayoutEffect runs in declaration order within a component. The compiler controls code generation, so it can ensure its
effects are declared first. But for effects in CHILD components reading DOM from PARENT components, the order is
children-first in React. This could cause issues.

12. React.lazy and code splitting

const LazyComponent = React.lazy(() => import('./HeavyComponent'));

The lazy component itself is a React component — the compiler doesn't touch it. But the component INSIDE the lazy boundary
could be compiled. When the chunk loads and the component mounts, the compiled setup runs normally. Should work, but needs
testing with Suspense fallbacks.

13. React Server Components interaction

RSCs run on the server and produce a serialized component tree. Client Components ("use client") are sent as references.
The compiled component would be a Client Component (it uses hooks, DOM APIs).

RSC → Client Component boundary: RSC passes serialized props to the client component. The client component receives
deserialized props and runs normally (compiled or not). This should work transparently.

But: RSC can pass children as serialized React elements. The compiled component receives these as children and uses
insert(). The inserted content is React elements that React's hydration mechanism handles. The compiler just needs to leave
children insertion to React.

14. React 19's ref as a prop

React 19 allows ref as a regular prop (no more forwardRef):

function Input({ ref, ...props }) {
return <input ref={ref} {...props} />;
}

The compiler needs to handle ref — call the ref callback with the actual DOM node or assign ref.current. Since the compiled
code has the DOM node directly, this is straightforward. But the ref must be called at the right time (during commit, not
render).

15. The React Compiler is already running

Both apps have reactCompiler: true. React Compiler transforms the component to auto-memoize values, callbacks, and JSX
elements. The react-fast compiler would run AFTER React Compiler's transform.

This means react-fast sees already-optimized code:

// React Compiler output (simplified)
function Card({ title }) {
const $ = useMemoCache(2);
if ($[0] !== title) {
$[1] = <div className="card"><h2>{title}</h2></div>;
$[0] = title;
}
return $[1]; // Already memoized!
}

React Compiler already returns cached elements when props haven't changed. react-fast would transform the JSX inside the
cache check to use templates instead. They compose — React Compiler prevents re-renders, react-fast makes re-renders
cheaper.

But the compiler ordering matters. If react-fast runs first, it transforms JSX to template code. Then React Compiler tries
to memoize the template code. This could work or could confuse React Compiler (it doesn't understand template() calls).

The safe order is: React Compiler first, react-fast second. react-fast sees the memoized output and transforms the JSX
within it.

16. Error boundaries can't catch compile-time errors

If the compiler generates buggy DOM patching code, errors thrown during useLayoutEffect are caught by React error
boundaries. But the error message/stack trace might be confusing because it points to generated code, not original JSX.

Source maps from the compiler must map generated code back to the original JSX locations.

17. Memory leaks from cached templates

const \_tmpl$ = template(`<div class="card">...</div>`);

Template elements are cached at module scope — they live forever. For a typical app with ~50-100 unique templates, this is
maybe 50-100 <template> elements (~50KB). Negligible.

But if the compiler somehow generates dynamic templates (bug), the cache grows unbounded. Must guarantee all templates are
static.

18. The key prop on compiled HTML elements

  <div key={id} className="card">...</div>

When key changes, React unmounts the old element and mounts a new one. With the compiled approach, the old DOM is torn down
(cleanup runs) and a new template is cloned. This works IF cleanup is thorough.

But there's a subtlety: React uses keys for RECONCILIATION. If the compiled component returns a stable element and skips
reconciliation, key changes on inner elements won't cause remounting. The compiler must either:
• Not optimize elements with dynamic keys
• Handle key changes manually in the patching logic

────────────────────────────────────────

That's the deep dive. The critical show-stoppers are: concurrent mode safety (must patch in useLayoutEffect, not render),
onChange event mapping, controlled input cursor position, and hydration event replay. Everything else is handleable with
careful code generation.

Want me to create the implementation plan now?

this https://github.com/lxsmnsyc/forgetti and clone facebook/react into tmp to study the react compiler sotuce
fcode

$ cd /tmp && git clone --depth 1 https://github.com/lxsmnsyc/forgetti.git 2>&1 848ms
Cloning into 'forgetti'...

$ cd /tmp && git clone --depth 1 --filter=blob:none --sparse https://github.com/facebook/react.git && cd react && git
sparse-checkout set compiler 2>&1 exit 128 • 224ms
fatal: destination path 'react' already exists and is not an empty directory.

$ rm -rf /tmp/react && cd /tmp && git clone --depth 1 --filter=blob:none --sparse https://github.com/facebook/react.git && cd
react && git sparse-checkout set compiler 2>&1 3.6s
Cloning into 'react'...

⬢ 3 agents completed
Study forgetti compiler source
✓ Done
Study React Compiler source code
✓ Done
Get forgetti transformation details
✓ Done
ctrl+o to expand

$ rm -rf /tmp/forgetti /tmp/react 833ms

OK here's what's clear now from studying all three:

The landscape

┌─────────────────┬───────────────────────────┬───────────────────────────────┬───────────────────────────────────────────┐
│ │ React Compiler │ Forgetti │ react-fast (proposed) │
├─────────────────┼───────────────────────────┼───────────────────────────────┼───────────────────────────────────────────┤
│ Level │ VDOM │ VDOM │ DOM │
│ What it skips │ Re-creating React │ Re-creating React elements │ React elements + reconciliation + DOM │
│ │ elements │ │ diffing │
│ JSX output │ Cached JSX elements │ JSX extracted into memo'd │ Template cloning + direct DOM ops │
│ │ │ wrappers │ │
│ When values │ Re-create elements, │ Re-create elements, reconcile │ Direct DOM patch │
│ change │ reconcile │ │ │
└─────────────────┴───────────────────────────┴───────────────────────────────┴───────────────────────────────────────────┘

Both React Compiler and Forgetti stay at the VDOM level. They memoize React elements so they aren't re-created
unnecessarily. But when values DO change, React still runs the full pipeline: create new elements → reconcile fiber tree →
diff DOM → commit.

react-fast would be the first to go below the VDOM — when values change, it patches the DOM directly. No elements created,
no reconciliation, no diffing.

Key insights from the study

React Compiler's approach to JSX: It just caches the element in a memo slot. $[i] = <div>{title}</div>. When title changes,
it creates a brand new element and React reconciles. The optimization is preventing re-creation when nothing changed — not
making the re-creation cheaper.

Forgetti's JSX extraction is interesting. It hoists JSX into a separate React.memo wrapper component, passing dynamic
values as a flat v array. This is conceptually similar to what react-fast would do — separating the static structure
(template) from the dynamic values (the v array). But Forgetti still uses React.memo + VDOM. react-fast would use the same
separation but with template cloning + direct DOM patching instead.

The flat cache array pattern. Both React Compiler and Forgetti use a flat array ($[i]) for caching with === comparison.
react-fast could use the same pattern for tracking previous values:

// React Compiler: if value changed, create new React element
if ($[0] !== title) {
    $[1] = <h2>{title}</h2>;  // VDOM element
    $[0] = title;
  }
  // react-fast: if value changed, patch DOM directly
  if ($[0] !== title) {
\_h2TextNode.data = title; // DOM mutation
$[0] = title;
}

Same dependency tracking, same cache structure, radically different output.

Reactive scope grouping from React Compiler. React Compiler groups co-dependent values into scopes that invalidate
together. This is smarter than per-expression checks (fewer comparisons). react-fast could use the same analysis — group
dynamic values that change together and batch their DOM patches.

The compilation pipeline matters. React Compiler builds a full HIR with SSA, dataflow analysis, mutation tracking, and
reactivity inference. This is what lets it be safe and correct. react-fast would benefit from a similar analysis to know:
• Which expressions are truly dynamic (change between renders)
• Which are static (can be inlined into the template)
• Which are "stable" (refs, setState — never change)

What react-fast's compiler pipeline would look like

Input JSX
↓

1. Parse (Babel AST)
   ↓
2. Classify expressions: static vs dynamic vs stable
   (Can borrow React Compiler's reactivity inference, or do simpler version)
   ↓
3. For each JSX tree rooted at HTML elements:
   a. Extract static parts → HTML template string
   b. Identify dynamic "holes" → list of {path, expression}
   c. Identify event handlers → delegation setup
   d. Identify React components → leave as createElement, use insert()
   ↓
4. Generate output:
   - template() call at module scope
   - Component body: cloneNode + walk to dynamic nodes
   - Flat cache array for dependency tracking
   - if ($[i] !== expr) patches for each dynamic hole
   - useLayoutEffect for controlled inputs + initial setup
     ↓
5. Compose with React Compiler:
   - React Compiler runs first (handles memoization, scope analysis)
   - react-fast runs second (transforms cached JSX elements into DOM ops)

Composing with React Compiler is the key architectural choice. React Compiler handles the hard problems (reactivity
analysis, scope grouping, hook handling, safety validation). react-fast just transforms the JSX that React Compiler already
identified as needing recomputation — from "create new VDOM element" to "patch DOM directly."

This means react-fast doesn't need its own reactivity analysis. It piggybacks on React Compiler's existing infrastructure.

Want me to make the implementation plan now?

make plan

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Plan (rejected) │
│ │
│ react-fast Implementation Plan │
│ │
│ What we're building │
│ │
│ A Babel plugin (babel-plugin-react-fast) and a runtime library (react-fast) that transform React component JSX into │
│ direct DOM operations: │
│ • Init path: template() with innerHTML + cloneNode(true) (dom-expressions pattern) │
│ • Update path: flat cache array with === checks + direct DOM mutations │
│ • Composition: runs AFTER React Compiler, transforms its cached JSX into DOM ops │
│ │
│ Package structure │
│ │
│ packages/ │
│ ├── react-fast/ # Runtime library (~200 lines) │
│ │ ├── src/ │
│ │ │ ├── index.ts # Public exports │
│ │ │ ├── template.ts # template() — innerHTML + cloneNode cache │
│ │ │ ├── insert.ts # insert() — dynamic children (conditionals, lists, components) │
│ │ │ ├── spread.ts # spread() — dynamic prop spreading │
│ │ │ ├── reconcile.ts # reconcileArrays() — keyed list diffing │
│ │ │ ├── event.ts # delegateEvents() + eventHandler │
│ │ │ └── props.ts # style(), className(), setAttribute() helpers │
│ │ └── package.json │
│ └── babel-plugin-react-fast/ # Babel compiler plugin │
│ ├── src/ │
│ │ ├── index.ts # Plugin entry — Program visitor │
│ │ ├── transform.ts # Main JSX→DOM transformation │
│ │ ├── template.ts # Static HTML template extraction │
│ │ ├── element.ts # Element attribute handling + dynamic detection │
│ │ ├── children.ts # Children transformation (text, expressions, components) │
│ │ └── constants.ts # DOM property maps, delegated events, void elements │
│ └── package.json │
│ │
│ Transformation: before → after │
│ │
│ Input (after React Compiler has run): │
│ │
│ function Card({ title, body, isActive }) { │
│ return ( │
│ <div className={cn("card", isActive && "active")}> │
│ <h2>{title}</h2> │
│ <p>{body}</p> │
│ <button onClick={() => alert(title)}>Click</button> │
│ </div> │
│ ); │
│ } │
│ │
│ Output: │
│ │
│ import { template as \_t, delegateEvents as \_de } from "react-fast"; │
│ const \_tmpl$ = \_t(`<div><h2> </h2><p> </p><button>Click</button></div>`); │
│ function Card({ title, body, isActive }) { │
│ const \_cache = useMemoCache(6); │
│ // First render: clone template, walk to dynamic nodes │
│ if (\_cache[0] === SENTINEL) { │
│ const \_el$ = \_tmpl$();                                                                                              │
 │     const _h2 = _el$.firstChild; │
│ const \_p = \_h2.nextSibling; │
│ const \_btn = \_p.nextSibling; │
│ \_cache[0] = \_el$;                                                                                                   │
 │     _cache[1] = _h2.firstChild;  // h2 text node                                                                        │
 │     _cache[2] = _p.firstChild;   // p text node                                                                         │
 │     _cache[3] = _btn;                                                                                                   │
 │   }                                                                                                                     │
 │   // Patch dynamic values (only when changed)                                                                           │
 │   const _el$ = \_cache[0]; │
│ if (\_cache[4] !== title) { │
│ \_cache[1].data = title; │
│ \_cache[3].$$click = () => alert(title);                                                                             │
 │     _cache[4] = title;                                                                                                  │
 │   }                                                                                                                     │
 │   if (_cache[5] !== body) {                                                                                             │
 │     _cache[2].data = body;                                                                                              │
 │     _cache[5] = body;                                                                                                   │
 │   }                                                                                                                     │
 │   _el$.className = cn("card", isActive && "active");                                                                    │
 │   return _el$;                                                                                                          │
 │ }                                                                                                                       │
 │ _de(["click"]);                                                                                                         │
 │                                                                                                                         │
 │ Key difference from VDOM: when title changes, we do textNode.data = title instead of creating                           │
 │ React.createElement("h2", null, title) and reconciling.                                                                 │
 │                                                                                                                         │
 │ Runtime library (Phase 1)                                                                                               │
 │                                                                                                                         │
 │ Port the essential functions from dom-expressions' client.js:                                                           │
 │ • template(html) — create <template> element, cache it, return () => cloneNode(true). ~15 lines.                        │
 │ • delegateEvents(names) — attach top-level event delegation handlers on document. ~20 lines.                            │
 │ • insert(parent, value, marker) — handle dynamic children: strings, numbers, null, DOM nodes, arrays, functions.        │
 │   This is the most complex piece (~80 lines). Handles conditionals and component output.                                │
 │ • reconcileArrays(parent, current, next) — keyed list reconciliation. Port from dom-expressions. ~60 lines.             │
 │ • spread(node, props, isSVG) — apply a dynamic props object to a DOM node. ~30 lines.                                   │
 │ • style(node, value, prev), className(node, value), setAttribute(node, name, value) — prop helpers. ~20 lines each.     │
 │                                                                                                                         │
 │ Total: ~250 lines.                                                                                                      │
 │                                                                                                                         │
 │ Babel plugin (Phase 2)                                                                                                  │
 │                                                                                                                         │
 │ Transformation rules                                                                                                    │
 │                                                                                                                         │
 │ • HTML element (<div>, <span>, etc.)                                                                                    │
 │   • Static attributes → inline into template HTML string                                                                │
 │   • Dynamic attributes → effect code that patches via node.prop = value                                                 │
 │   • className → className(node, value) helper                                                                           │
 │   • style (object) → style(node, value, prev) helper                                                                    │
 │   • ref → call ref callback or set .current in setup                                                                    │
 │   • on* events → event delegation (node.$$eventname = handler) or direct addEventListener for non-delegatable │
│ events │
│ • dangerouslySetInnerHTML → node.innerHTML = value.\_\_html │
│ • children → text: textNode.data = value, element: recursively transform, expression: insert() │
│ • key → preserve on parent's tracking, don't emit to DOM │
│ • React component (<MyComponent />) │
│ • Leave as createElement(MyComponent, props) — untouched │
│ • Parent uses insert() to place the component's output in the DOM │
│ • Fragment (<>...</>) │
│ • No wrapper element; children are siblings with comment markers for insert() boundaries │
│ • Dynamic element type (const Tag = cond ? "h1" : "h2") │
│ • Bail out entirely — leave as createElement │
│ • Spread props (<div {...props} />) │
│ • Use runtime spread() helper │
│ • SVG elements │
│ • Wrap template in <svg> during creation, extract inner content (dom-expressions pattern) │
│ • Use setAttribute instead of property assignment for SVG attributes │
│ │
│ Event mapping (React → DOM) │
│ │
│ • onChange on <input>/<textarea> → input event (NOT native change) │
│ • onDoubleClick → dblclick │
│ • onFocus/onBlur for delegation → focusin/focusout │
│ • All other on\* → lowercase event name │
│ │
│ Controlled inputs │
│ │
│ • <input value={x} /> → set input.value = x in useLayoutEffect (not render body) │
│ • <input checked={x} /> → set input.checked = x in useLayoutEffect │
│ • <select value={x} /> → set select.value = x in useLayoutEffect (after children render) │
│ │
│ Return value strategy (Phase 3) │
│ │
│ The compiled component returns a raw DOM node. React can't handle this directly. Two approaches, implement Option A │
│ first: │
│ Option A — Outer element is React, inner is compiled: │
│ │
│ function Card({ title }) { │
│ // \_el$ is the cloned template content (inner DOM) │
│ // Return a React element for the outermost node │
│ // Use ref callback to append cloned content on mount │
│ const \_ref = useCallback(node => { │
│ if (node) node.appendChild(\_el$);                                                                                   │
 │   }, []);                                                                                                               │
 │   return createElement("div", { className: "card", ref: _ref });                                                        │
 │ }                                                                                                                       │
 │                                                                                                                         │
 │ Trade-off: outermost element goes through React (minimal cost), everything inside is direct DOM.                        │
 │ Option B — useRef + stable return (bikeshed later):                                                                     │
 │ Return a stable React element and patch everything including outer element via DOM. Requires returning an empty         │
 │ wrapper on first render, filling it in useLayoutEffect.                                                                 │
 │                                                                                                                         │
 │ Composition with React Compiler (Phase 4)                                                                               │
 │                                                                                                                         │
 │ • react-fast runs as a second Babel plugin after babel-plugin-react-compiler                                            │
 │ • React Compiler's output already has useMemoCache and scope-based invalidation                                         │
 │ • react-fast recognizes React Compiler's cache patterns and transforms the JSX within them:                             │
 │   • $[i] = <div>...</div> (VDOM) → $[i] = _tmpl$() + DOM setup (DOM) │
│ • if ($[0] !== dep) { $[1] = <h2>{dep}</h2> } → if ($[0] !== dep) { \_textNode.data = dep } │
│ • This means react-fast inherits React Compiler's reactivity analysis for free │
│ │
│ SSR support (Phase 5, later) │
│ │
│ • Server: compiler emits a string-concatenation version alongside the client template code │
│ • Hydration: getNextElement() walks server-rendered DOM instead of cloneNode — same as dom-expressions │
│ • ssr: false components: no hydration needed, pure client template path │
│ • Scoped to "use client" components only — RSC untouched │
│ │
│ What to build first │
│ │
│ Start with the runtime + plugin for the simplest case: static HTML with dynamic text and attributes. No lists, no │
│ conditionals, no components inside, no SSR. Get one component working end-to-end, then expand. │
│ │
│ Testing strategy │
│ │
│ • Unit tests for each runtime function (template, insert, reconcileArrays, etc.) │
│ • Babel plugin snapshot tests: input JSX → expected output code │
│ • Integration test: simple React app with compiled components, verify DOM output matches │
│ • Comparison benchmark: compiled vs uncompiled component rendering 1000 items
