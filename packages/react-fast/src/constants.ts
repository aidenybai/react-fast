const BOOLEAN_ATTRIBUTE_NAMES = [
  "allowfullscreen",
  "async",
  "alpha",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "hidden",
  "indeterminate",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "seamless",
  "selected",
];

export const BooleanAttributes = new Set(BOOLEAN_ATTRIBUTE_NAMES);

export const Properties = new Set([
  "className",
  "value",
  "readOnly",
  "noValidate",
  "formNoValidate",
  "isMap",
  "noModule",
  "playsInline",
  "allowFullscreen",
  "defaultChecked",
  "defaultMuted",
  "defaultSelected",
  "disablePictureInPicture",
  "disableRemotePlayback",
  "preservesPitch",
  "shadowRootClonable",
  "shadowRootDelegatesFocus",
  "shadowRootSerializable",
  ...BOOLEAN_ATTRIBUTE_NAMES,
]);

export const ChildProperties = new Set(["innerHTML", "textContent", "innerText", "children"]);

export const Aliases: Record<string, string> = Object.assign(Object.create(null), {
  className: "class",
  htmlFor: "for",
});

interface PropAliasMapping {
  $: string;
  [tagName: string]: string | number;
}

export const PropAliases: Record<string, string | PropAliasMapping> = Object.assign(
  Object.create(null),
  {
    class: "className",
    novalidate: { $: "noValidate", FORM: 1 },
    formnovalidate: { $: "formNoValidate", BUTTON: 1, INPUT: 1 },
    ismap: { $: "isMap", IMG: 1 },
    nomodule: { $: "noModule", SCRIPT: 1 },
    playsinline: { $: "playsInline", VIDEO: 1 },
    readonly: { $: "readOnly", INPUT: 1, TEXTAREA: 1 },
    allowfullscreen: { $: "allowFullscreen", IFRAME: 1 },
    defaultchecked: { $: "defaultChecked", INPUT: 1 },
    defaultmuted: { $: "defaultMuted", AUDIO: 1, VIDEO: 1 },
    defaultselected: { $: "defaultSelected", OPTION: 1 },
    disablepictureinpicture: { $: "disablePictureInPicture", VIDEO: 1 },
    disableremoteplayback: { $: "disableRemotePlayback", AUDIO: 1, VIDEO: 1 },
    preservespitch: { $: "preservesPitch", AUDIO: 1, VIDEO: 1 },
    shadowrootclonable: { $: "shadowRootClonable", TEMPLATE: 1 },
    shadowrootdelegatesfocus: { $: "shadowRootDelegatesFocus", TEMPLATE: 1 },
    shadowrootserializable: { $: "shadowRootSerializable", TEMPLATE: 1 },
  },
);

export const getPropAlias = (prop: string, tagName: string): string | undefined => {
  const alias = PropAliases[prop];
  if (typeof alias === "object") return alias[tagName] ? alias["$"] : undefined;
  return alias;
};

export const DelegatedEvents = new Set([
  "beforeinput",
  "click",
  "dblclick",
  "contextmenu",
  "focusin",
  "focusout",
  "input",
  "keydown",
  "keyup",
  "mousedown",
  "mousemove",
  "mouseout",
  "mouseover",
  "mouseup",
  "pointerdown",
  "pointermove",
  "pointerout",
  "pointerover",
  "pointerup",
  "touchend",
  "touchmove",
  "touchstart",
]);

export const SVGNamespace: Record<string, string> = {
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
};
