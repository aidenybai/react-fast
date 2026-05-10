function hoisted1() { console.log("hoisted"); }
const hoisted2 = () => console.log("hoisted delegated")

const template = (
  <div id="main">
    <button onClick={() => console.log("delegated")}>Click Delegated</button>
    <button onClick={handler}>Click Delegated</button>
    <button onClick={hoisted2}>Click Delegated</button>
    <button onMouseDown={() => console.log("mousedown")}>Mouse Down</button>
    <button onKeyDown={(e) => handleKey(e)}>Key Down</button>
    <button onFocus={() => console.log("focus")}>Focus</button>
    <button onBlur={() => console.log("blur")}>Blur</button>
    <button onDblClick={() => console.log("dblclick")}>Double Click</button>
  </div>
);

const template2 = (
  <div>
    <input onChange={(e) => setValue(e.target.value)} />
    <textarea onChange={(e) => setText(e.target.value)} />
    <select onChange={(e) => setOption(e.target.value)}>
      <option value="a">A</option>
      <option value="b">B</option>
    </select>
  </div>
);

const template3 = (
  <div>
    <button onClickCapture={() => console.log("capture")}>Capture</button>
  </div>
);

const template4 = (
  <div>
    <button onClick={() => setCount(c => c + 1)} onMouseEnter={handleHover} onMouseLeave={handleLeave}>
      Complex
    </button>
  </div>
);

const template5 = (
  <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <input type="text" onInput={(e) => setName(e.target.value)} />
    <button type="submit">Submit</button>
  </form>
);
