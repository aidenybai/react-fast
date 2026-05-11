import { act as reactAct } from "react";
import * as ReactDOMClient from "react-dom/client";
import { renderToString } from "react-dom/server";
import { it } from "vitest";

const act = reactAct;

const shouldUseDocument = (reactElement: React.ReactElement): boolean => {
  return reactElement && reactElement.type === "html";
};

const getContainerFromMarkup = (reactElement: React.ReactElement, markup: string) => {
  if (shouldUseDocument(reactElement)) {
    const doc = document.implementation.createHTMLDocument("");
    doc.open();
    doc.write(markup || "<!doctype html><html><meta charset=utf-8><title>test doc</title>");
    doc.close();
    return doc;
  } else {
    const container = document.createElement("div");
    container.innerHTML = markup;
    return container;
  }
};

const asyncReactDOMRender = async (
  reactElement: React.ReactElement,
  domElement: Document | HTMLElement,
  forceHydrate: boolean,
) => {
  if (forceHydrate) {
    await act(() => {
      ReactDOMClient.hydrateRoot(domElement, reactElement, {
        onRecoverableError() {},
      });
    });
  } else {
    await act(() => {
      const root = ReactDOMClient.createRoot(domElement);
      root.render(reactElement);
    });
  }
};

export type RenderFunction = (element: React.ReactElement) => Promise<ChildNode | null>;

export const serverRender: RenderFunction = async (reactElement) => {
  const markup = renderToString(reactElement);
  return getContainerFromMarkup(reactElement, markup).firstChild;
};

export const clientCleanRender: RenderFunction = async (reactElement) => {
  if (shouldUseDocument(reactElement)) {
    return clientRenderOnServerString(reactElement);
  }
  const container = document.createElement("div");
  await asyncReactDOMRender(reactElement, container, false);
  return container.firstChild;
};

export const clientRenderOnServerString: RenderFunction = async (reactElement) => {
  const markup = renderToString(reactElement);
  const container = getContainerFromMarkup(reactElement, markup);
  await asyncReactDOMRender(reactElement, container, true);
  return container.firstChild;
};

export const itRenders = (
  description: string,
  testFunction: (render: RenderFunction) => Promise<void>,
) => {
  it(`renders ${description} with server string render`, () => testFunction(serverRender));
  it(`renders ${description} with clean client render`, () => testFunction(clientCleanRender));
  it(`renders ${description} with client render on top of server markup`, () =>
    testFunction(clientRenderOnServerString));
};

export const itClientRenders = (
  description: string,
  testFunction: (render: RenderFunction) => Promise<void>,
) => {
  it(`renders ${description} with clean client render`, () => testFunction(clientCleanRender));
  it(`renders ${description} with client render on top of server markup`, () =>
    testFunction(clientRenderOnServerString));
};
