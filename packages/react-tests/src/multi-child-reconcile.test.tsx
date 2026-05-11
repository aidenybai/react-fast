import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { describe, it, expect } from "vitest";
import { act } from "./utils";

const stripEmptyValues = (obj: Record<string, unknown>) => {
  const ret: Record<string, unknown> = {};
  for (const name in obj) {
    if (!obj.hasOwnProperty(name)) {
      continue;
    }
    if (obj[name] !== null && obj[name] !== undefined) {
      ret[name] = obj[name];
    }
  }
  return ret;
};

let idCounter = 123;

class StatusDisplay extends React.Component<{
  status: string;
  contentKey: string;
  onFlush: () => void;
}> {
  state = { internalState: idCounter++ };

  getStatus() {
    return this.props.status;
  }

  getInternalState() {
    return this.state.internalState;
  }

  componentDidMount() {
    this.props.onFlush();
  }

  componentDidUpdate() {
    this.props.onFlush();
  }

  render() {
    return <div>{this.props.contentKey}</div>;
  }
}

class FriendsStatusDisplay extends React.Component<{
  usernameToStatus?: Record<string, string | null>;
  prepareChildren: (children: React.ReactNode[]) => unknown;
}> {
  displays: Record<string, StatusDisplay | null> = {};

  getOriginalKeys() {
    const originalKeys: string[] = [];
    for (const key in this.props.usernameToStatus) {
      if (this.props.usernameToStatus[key]) {
        originalKeys.push(key);
      }
    }
    return originalKeys;
  }

  getStatusDisplays() {
    const res: Record<string, StatusDisplay | null> = {};
    const originalKeys = this.getOriginalKeys();
    for (let i = 0; i < originalKeys.length; i++) {
      const key = originalKeys[i];
      res[key] = this.displays[key];
    }
    return res;
  }

  verifyPreviousRefsResolved(flushedKey: string) {
    const originalKeys = this.getOriginalKeys();
    for (let i = 0; i < originalKeys.length; i++) {
      const key = originalKeys[i];
      if (key === flushedKey) {
        return;
      }
      expect(this.displays[key]).toBeTruthy();
    }
  }

  render() {
    const children: React.ReactNode[] = [];
    for (const key in this.props.usernameToStatus) {
      const status = this.props.usernameToStatus[key];
      children.push(
        !status ? null : (
          <StatusDisplay
            key={key}
            ref={(current) => {
              this.displays[key] = current;
            }}
            contentKey={key}
            onFlush={this.verifyPreviousRefsResolved.bind(this, key)}
            status={status}
          />
        ),
      );
    }
    const childrenToRender = this.props.prepareChildren(children);
    return <div>{childrenToRender as React.ReactNode}</div>;
  }
}

function getInternalStateByUserName(statusDisplays: Record<string, StatusDisplay | null>) {
  return Object.keys(statusDisplays).reduce(
    (acc, key) => {
      acc[key] = statusDisplays[key]!.getInternalState();
      return acc;
    },
    {} as Record<string, number>,
  );
}

function verifyStatuses(
  statusDisplays: Record<string, StatusDisplay | null>,
  props: { usernameToStatus?: Record<string, string | null> },
) {
  const nonEmptyStatusDisplays = stripEmptyValues(statusDisplays);
  const nonEmptyStatusProps = stripEmptyValues(props.usernameToStatus || {});
  expect(Object.keys(nonEmptyStatusDisplays).length).toEqual(
    Object.keys(nonEmptyStatusProps).length,
  );
  for (const username in nonEmptyStatusDisplays) {
    if (!nonEmptyStatusDisplays.hasOwnProperty(username)) {
      continue;
    }
    expect((nonEmptyStatusDisplays[username] as StatusDisplay).getStatus()).toEqual(
      nonEmptyStatusProps[username],
    );
  }

  for (const username in nonEmptyStatusProps) {
    if (!nonEmptyStatusProps.hasOwnProperty(username)) {
      continue;
    }
    expect((nonEmptyStatusDisplays[username] as StatusDisplay).getStatus()).toEqual(
      nonEmptyStatusProps[username],
    );
  }

  expect(Object.keys(nonEmptyStatusDisplays)).toEqual(Object.keys(nonEmptyStatusProps));
}

function verifyStatesPreserved(
  lastInternalStates: Record<string, number>,
  statusDisplays: Record<string, StatusDisplay | null>,
) {
  for (const key in statusDisplays) {
    if (!statusDisplays.hasOwnProperty(key)) {
      continue;
    }
    if (lastInternalStates[key]) {
      expect(lastInternalStates[key]).toEqual(statusDisplays[key]!.getInternalState());
    }
  }
}

function verifyDomOrderingAccurate(
  outerContainer: HTMLElement,
  statusDisplays: Record<string, StatusDisplay | null>,
) {
  const containerNode = outerContainer.firstChild!;
  const statusDisplayNodes = containerNode.childNodes;
  const orderedDomKeys: string[] = [];
  for (let i = 0; i < statusDisplayNodes.length; i++) {
    const contentKey = statusDisplayNodes[i].textContent!;
    orderedDomKeys.push(contentKey);
  }

  const orderedLogicalKeys: string[] = [];
  for (const username in statusDisplays) {
    if (!statusDisplays.hasOwnProperty(username)) {
      continue;
    }
    const statusDisplay = statusDisplays[username]!;
    orderedLogicalKeys.push(statusDisplay.props.contentKey);
  }
  expect(orderedDomKeys).toEqual(orderedLogicalKeys);
}

interface PropsSequenceItem {
  usernameToStatus?: Record<string, string | null>;
}

async function testPropsSequenceWithPreparedChildren(
  sequence: PropsSequenceItem[],
  prepareChildren: (children: React.ReactNode[]) => unknown,
) {
  const container = document.createElement("div");
  const root = ReactDOMClient.createRoot(container);
  let parentInstance: FriendsStatusDisplay | undefined;
  await act(() => {
    root.render(
      <FriendsStatusDisplay
        {...sequence[0]}
        prepareChildren={prepareChildren}
        ref={(current) => {
          if (parentInstance === undefined) {
            parentInstance = current as FriendsStatusDisplay;
          }
        }}
      />,
    );
  });
  let statusDisplays = parentInstance!.getStatusDisplays();
  let lastInternalStates = getInternalStateByUserName(statusDisplays);
  verifyStatuses(statusDisplays, sequence[0]);

  for (let i = 1; i < sequence.length; i++) {
    await act(() => {
      root.render(<FriendsStatusDisplay {...sequence[i]} prepareChildren={prepareChildren} />);
    });

    statusDisplays = parentInstance!.getStatusDisplays();
    verifyStatuses(statusDisplays, sequence[i]);
    verifyStatesPreserved(lastInternalStates, statusDisplays);
    verifyDomOrderingAccurate(container, statusDisplays);

    lastInternalStates = getInternalStateByUserName(statusDisplays);
  }
}

function prepareChildrenArray(childrenArray: React.ReactNode[]) {
  return childrenArray;
}

function prepareChildrenLegacyIterable(childrenArray: React.ReactNode[]) {
  return {
    "@@iterator": function* () {
      for (const child of childrenArray) {
        yield child;
      }
    },
  };
}

function prepareChildrenModernIterable(childrenArray: React.ReactNode[]) {
  return {
    [Symbol.iterator]: function* () {
      for (const child of childrenArray) {
        yield child;
      }
    },
  };
}

async function testPropsSequence(sequence: PropsSequenceItem[]) {
  await testPropsSequenceWithPreparedChildren(sequence, prepareChildrenArray);
  await testPropsSequenceWithPreparedChildren(sequence, prepareChildrenLegacyIterable);
  await testPropsSequenceWithPreparedChildren(sequence, prepareChildrenModernIterable);
}

describe("ReactMultiChildReconcile", () => {
  it("should reset internal state if removed then readded in an array", async () => {
    const props = {
      usernameToStatus: {
        jcw: "jcwStatus",
      },
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    let parentInstance: FriendsStatusDisplay | undefined;
    await act(() => {
      root.render(
        <FriendsStatusDisplay
          {...props}
          prepareChildren={prepareChildrenArray}
          ref={(current) => {
            if (parentInstance === undefined) {
              parentInstance = current as FriendsStatusDisplay;
            }
          }}
        />,
      );
    });
    let statusDisplays = parentInstance!.getStatusDisplays();
    const startingInternalState = statusDisplays.jcw!.getInternalState();

    await act(() => {
      root.render(<FriendsStatusDisplay prepareChildren={prepareChildrenArray} />);
    });

    statusDisplays = parentInstance!.getStatusDisplays();
    expect(statusDisplays.jcw).toBeFalsy();

    await act(() => {
      root.render(<FriendsStatusDisplay {...props} prepareChildren={prepareChildrenArray} />);
    });

    statusDisplays = parentInstance!.getStatusDisplays();
    expect(statusDisplays.jcw).toBeTruthy();
    expect(statusDisplays.jcw!.getInternalState()).not.toBe(startingInternalState);
  });

  it("should reset internal state if removed then readded in a legacy iterable", async () => {
    const props = {
      usernameToStatus: {
        jcw: "jcwStatus",
      },
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    let parentInstance: FriendsStatusDisplay | undefined;
    await act(() => {
      root.render(
        <FriendsStatusDisplay
          {...props}
          prepareChildren={prepareChildrenLegacyIterable}
          ref={(current) => {
            if (parentInstance === undefined) {
              parentInstance = current as FriendsStatusDisplay;
            }
          }}
        />,
      );
    });

    let statusDisplays = parentInstance!.getStatusDisplays();
    const startingInternalState = statusDisplays.jcw!.getInternalState();

    await act(() => {
      root.render(<FriendsStatusDisplay prepareChildren={prepareChildrenLegacyIterable} />);
    });

    statusDisplays = parentInstance!.getStatusDisplays();
    expect(statusDisplays.jcw).toBeFalsy();

    await act(() => {
      root.render(
        <FriendsStatusDisplay {...props} prepareChildren={prepareChildrenLegacyIterable} />,
      );
    });

    statusDisplays = parentInstance!.getStatusDisplays();
    expect(statusDisplays.jcw).toBeTruthy();
    expect(statusDisplays.jcw!.getInternalState()).not.toBe(startingInternalState);
  });

  it("should reset internal state if removed then readded in a modern iterable", async () => {
    const props = {
      usernameToStatus: {
        jcw: "jcwStatus",
      },
    };

    const container = document.createElement("div");
    const root = ReactDOMClient.createRoot(container);
    let parentInstance: FriendsStatusDisplay | undefined;
    await act(() => {
      root.render(
        <FriendsStatusDisplay
          {...props}
          prepareChildren={prepareChildrenModernIterable}
          ref={(current) => {
            if (parentInstance === undefined) {
              parentInstance = current as FriendsStatusDisplay;
            }
          }}
        />,
      );
    });

    let statusDisplays = parentInstance!.getStatusDisplays();
    const startingInternalState = statusDisplays.jcw!.getInternalState();

    await act(() => {
      root.render(<FriendsStatusDisplay prepareChildren={prepareChildrenModernIterable} />);
    });

    statusDisplays = parentInstance!.getStatusDisplays();
    expect(statusDisplays.jcw).toBeFalsy();

    await act(() => {
      root.render(
        <FriendsStatusDisplay {...props} prepareChildren={prepareChildrenModernIterable} />,
      );
    });

    statusDisplays = parentInstance!.getStatusDisplays();
    expect(statusDisplays.jcw).toBeTruthy();
    expect(statusDisplays.jcw!.getInternalState()).not.toBe(startingInternalState);
  });

  it("should create unique identity", async () => {
    const usernameToStatus = {
      jcw: "jcwStatus",
      awalke: "awalkeStatus",
      bob: "bobStatus",
    };

    await testPropsSequence([{ usernameToStatus }]);
  });

  it("should preserve order if children order has not changed", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          jcw: "jcwstatus2",
          jordanjcw: "jordanjcwstatus2",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should transition from zero to one children correctly", async () => {
    const PROPS_SEQUENCE = [
      { usernameToStatus: {} },
      {
        usernameToStatus: {
          first: "firstStatus",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should transition from one to zero children correctly", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          first: "firstStatus",
        },
      },
      { usernameToStatus: {} },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should transition from one child to null children", async () => {
    await testPropsSequence([
      {
        usernameToStatus: {
          first: "firstStatus",
        },
      },
      {},
    ]);
  });

  it("should transition from null children to one child", async () => {
    await testPropsSequence([
      {},
      {
        usernameToStatus: {
          first: "firstStatus",
        },
      },
    ]);
  });

  it("should transition from zero children to null children", async () => {
    await testPropsSequence([
      {
        usernameToStatus: {},
      },
      {},
    ]);
  });

  it("should transition from null children to zero children", async () => {
    await testPropsSequence([
      {},
      {
        usernameToStatus: {},
      },
    ]);
  });

  it("should remove nulled out children at the beginning", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          jcw: null,
          jordanjcw: "jordanjcwstatus2",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should remove nulled out children at the end", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          jcw: "jcwstatus2",
          jordanjcw: null,
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should reverse the order of two children", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          userOne: "userOneStatus",
          userTwo: "userTwoStatus",
        },
      },
      {
        usernameToStatus: {
          userTwo: "userTwoStatus",
          userOne: "userOneStatus",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should reverse the order of more than two children", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          userOne: "userOneStatus",
          userTwo: "userTwoStatus",
          userThree: "userThreeStatus",
        },
      },
      {
        usernameToStatus: {
          userThree: "userThreeStatus",
          userTwo: "userTwoStatus",
          userOne: "userOneStatus",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should cycle order correctly", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          userOne: "userOneStatus",
          userTwo: "userTwoStatus",
          userThree: "userThreeStatus",
          userFour: "userFourStatus",
        },
      },
      {
        usernameToStatus: {
          userTwo: "userTwoStatus",
          userThree: "userThreeStatus",
          userFour: "userFourStatus",
          userOne: "userOneStatus",
        },
      },
      {
        usernameToStatus: {
          userThree: "userThreeStatus",
          userFour: "userFourStatus",
          userOne: "userOneStatus",
          userTwo: "userTwoStatus",
        },
      },
      {
        usernameToStatus: {
          userFour: "userFourStatus",
          userOne: "userOneStatus",
          userTwo: "userTwoStatus",
          userThree: "userThreeStatus",
        },
      },
      {
        usernameToStatus: {
          userOne: "userOneStatus",
          userTwo: "userTwoStatus",
          userThree: "userThreeStatus",
          userFour: "userFourStatus",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should cycle order correctly in the other direction", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          userOne: "userOneStatus",
          userTwo: "userTwoStatus",
          userThree: "userThreeStatus",
          userFour: "userFourStatus",
        },
      },
      {
        usernameToStatus: {
          userFour: "userFourStatus",
          userOne: "userOneStatus",
          userTwo: "userTwoStatus",
          userThree: "userThreeStatus",
        },
      },
      {
        usernameToStatus: {
          userThree: "userThreeStatus",
          userFour: "userFourStatus",
          userOne: "userOneStatus",
          userTwo: "userTwoStatus",
        },
      },
      {
        usernameToStatus: {
          userTwo: "userTwoStatus",
          userThree: "userThreeStatus",
          userFour: "userFourStatus",
          userOne: "userOneStatus",
        },
      },
      {
        usernameToStatus: {
          userOne: "userOneStatus",
          userTwo: "userTwoStatus",
          userThree: "userThreeStatus",
          userFour: "userFourStatus",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should remove nulled out children and ignore new null children", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          jordanjcw: "jordanjcwstatus2",
          jcw: null,
          another: null,
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should remove nulled out children and reorder remaining", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
          john: "johnStatus",
          joe: "joeStatus",
        },
      },
      {
        usernameToStatus: {
          jordanjcw: "jordanjcwStatus",
          joe: "joeStatus",
          jcw: "jcwStatus",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should append children to the end", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
          jordanjcwnew: "jordanjcwnewStatus",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should append multiple children to the end", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
          jordanjcwnew: "jordanjcwnewStatus",
          jordanjcwnew2: "jordanjcwnewStatus2",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should prepend children to the beginning", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          newUsername: "newUsernameStatus",
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should prepend multiple children to the beginning", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          newNewUsername: "newNewUsernameStatus",
          newUsername: "newUsernameStatus",
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should not prepend an empty child to the beginning", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          emptyUsername: null,
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should not append an empty child to the end", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
          emptyUsername: null,
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should not insert empty children in the middle", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          jcw: "jcwstatus2",
          skipOverMe: null,
          skipOverMeToo: null,
          definitelySkipOverMe: null,
          jordanjcw: "jordanjcwstatus2",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should insert one new child in the middle", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          jcw: "jcwstatus2",
          insertThis: "insertThisStatus",
          jordanjcw: "jordanjcwstatus2",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should insert multiple new truthy children in the middle", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          jcw: "jcwstatus2",
          insertThis: "insertThisStatus",
          insertThisToo: "insertThisTooStatus",
          definitelyInsertThisToo: "definitelyInsertThisTooStatus",
          jordanjcw: "jordanjcwstatus2",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });

  it("should insert non-empty children in middle where nulls were", async () => {
    const PROPS_SEQUENCE = [
      {
        usernameToStatus: {
          jcw: "jcwStatus",
          insertThis: null,
          insertThisToo: null,
          definitelyInsertThisToo: null,
          jordanjcw: "jordanjcwStatus",
        },
      },
      {
        usernameToStatus: {
          jcw: "jcwstatus2",
          insertThis: "insertThisStatus",
          insertThisToo: "insertThisTooStatus",
          definitelyInsertThisToo: "definitelyInsertThisTooStatus",
          jordanjcw: "jordanjcwstatus2",
        },
      },
    ];
    await testPropsSequence(PROPS_SEQUENCE);
  });
});
