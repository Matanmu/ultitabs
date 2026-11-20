import { describe, expect, it } from "vitest";
import {
  detectRtlScrollType,
  generateId,
  logicalScrollFromStart,
  parseDuration,
  resolveElement,
  scrollLeftAfterDelta,
} from "./utils";

describe("utils", () => {
  it("generates incrementing ids", () => {
    const first = generateId("ut");
    const second = generateId("ut");
    expect(first).not.toBe(second);
    expect(second.startsWith("ut-")).toBe(true);
  });

  it("returns an element unchanged and resolves a selector", () => {
    const el = document.createElement("div");
    el.id = "find-me";
    document.body.appendChild(el);
    expect(resolveElement(el)).toBe(el);
    expect(resolveElement("#find-me")).toBe(el);
    expect(() => resolveElement("#missing-element")).toThrow("[ultitabs] Element not found");
    el.remove();
  });

  it("normalizes every RTL scrollLeft model to distance-from-start", () => {
    expect(logicalScrollFromStart(0, 100, "negative")).toBe(0);
    expect(logicalScrollFromStart(-100, 100, "negative")).toBe(100);
    expect(logicalScrollFromStart(100, 100, "normal")).toBe(0);
    expect(logicalScrollFromStart(0, 100, "normal")).toBe(100);
    expect(logicalScrollFromStart(0, 100, "inverted")).toBe(0);
    expect(logicalScrollFromStart(100, 100, "inverted")).toBe(100);
  });

  it("applies a toward-end delta in each RTL model", () => {
    expect(scrollLeftAfterDelta(0, 20, "negative")).toBe(-20);
    expect(scrollLeftAfterDelta(-40, -20, "negative")).toBe(-20);
    expect(scrollLeftAfterDelta(80, 20, "normal")).toBe(60);
    expect(scrollLeftAfterDelta(10, 20, "inverted")).toBe(30);
  });

  it("parses CSS durations", () => {
    expect(parseDuration("")).toBe(200);
    expect(parseDuration("   ")).toBe(200);
    expect(parseDuration("150ms")).toBe(150);
    expect(parseDuration("0.2s")).toBe(200);
    expect(parseDuration("nope")).toBe(200);
    expect(parseDuration("15")).toBe(15);
  });

  it("detects a stable RTL scroll type in this environment", () => {
    const first = detectRtlScrollType();
    const second = detectRtlScrollType();
    expect(["negative", "normal", "inverted"]).toContain(first);
    expect(second).toBe(first);
  });
});
