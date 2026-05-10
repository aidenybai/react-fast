import { act as reactAct } from "react";
import { expect } from "vitest";

export const act = reactAct;

const logs: string[] = [];

export const log = (message: string) => {
  logs.push(message);
};

export const assertLog = (expectedLogs: string[]) => {
  const actualLogs = logs.splice(0);
  expect(actualLogs).toEqual(expectedLogs);
};

export const clearLog = () => {
  logs.splice(0);
};
