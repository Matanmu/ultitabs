/**
 * Stylesheet behavior. The suite stub replaces window.getComputedStyle,
 * so these cases use their own window and the shipped CSS file.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../css/ultitabs.css"),
  "utf8",
);

function render(body: string, extraCss = "") {
  const dom = new JSDOM(
    `<!doctype html><html><head><style>${css}</style><style>${extraCss}</style></head><body>${body}</body></html>`,
    { pretendToBeVisual: true },
  );
  return dom.window;
}

function styleOf(window: Window, id: string) {
  const element = window.document.getElementById(id);
  if (!element) throw new Error(`missing #${id}`);
  return window.getComputedStyle(element);
}

describe("overflow scroll button", () => {
  const html = `
    <div data-ut-section>
      <div data-ut-scroller>
        <button data-ut-scroll-btn="start" id="shown"></button>
        <div data-ut-list><button data-ut-tab>A</button></div>
        <button data-ut-scroll-btn="end" id="hidden" data-ut-scroll-hidden></button>
      </div>
    </div>
    <div data-ut-section data-ut-orientation="vertical">
      <div data-ut-scroller>
        <button data-ut-scroll-btn="start" id="vhidden" data-ut-scroll-hidden></button>
        <div data-ut-list><button data-ut-tab>A</button></div>
        <button data-ut-scroll-btn="end" id="vshown"></button>
      </div>
    </div>
  `;

  it("keeps a visible arrow at 1.75rem and collapses a hidden arrow to zero", () => {
    const window = render(html);
    const shown = styleOf(window, "shown");
    const hidden = styleOf(window, "hidden");

    expect(shown.width).toBe("1.75rem");
    expect(shown.paddingLeft).toBe("0px");
    expect(shown.pointerEvents).toBe("auto");

    expect(hidden.width).toBe("0px");
    expect(hidden.height).toBe("0px");
    expect(hidden.minWidth).toBe("0px");
    expect(hidden.minHeight).toBe("0px");
    expect(hidden.paddingLeft).toBe("0px");
    expect(hidden.paddingRight).toBe("0px");
    expect(hidden.borderLeftWidth).toBe("0px");
    expect(hidden.borderRightWidth).toBe("0px");
    expect(hidden.marginLeft).toBe("0px");
    expect(hidden.marginRight).toBe("0px");
    expect(hidden.opacity).toBe("0");
    expect(hidden.pointerEvents).toBe("none");
    expect(hidden.overflow).toBe("hidden");
  });

  it("collapses a hidden vertical arrow as well", () => {
    const window = render(html);
    const hidden = styleOf(window, "vhidden");
    const shown = styleOf(window, "vshown");
    expect(shown.width).toBe("1.75rem");
    expect(hidden.width).toBe("0px");
    expect(hidden.height).toBe("0px");
  });
});

describe("nested variants", () => {
  it("does not give an inner underline list the outer pill track or tab radius", () => {
    const window = render(`
      <div data-ut-section data-ut-variant="pill">
        <div data-ut-scroller>
          <div data-ut-list id="outer-list">
            <button data-ut-tab id="outer-tab">Outer</button>
          </div>
        </div>
        <div data-ut-panel>
          <div data-ut-section data-ut-variant="underline">
            <div data-ut-list id="inner-list">
              <button data-ut-tab id="inner-tab">Inner</button>
            </div>
          </div>
        </div>
      </div>
    `);

    expect(styleOf(window, "outer-list").paddingTop).toBe("4px");
    expect(styleOf(window, "outer-list").borderRadius).toBe("9999px");
    expect(styleOf(window, "outer-tab").borderRadius).toBe("9999px");
    expect(styleOf(window, "inner-list").paddingTop).toBe("0px");
    expect(styleOf(window, "inner-list").borderRadius).not.toBe("9999px");
    expect(styleOf(window, "inner-tab").borderRadius).not.toBe("9999px");
  });

  it("keeps a nested horizontal pill round when the outer pill is vertical", () => {
    const window = render(`
      <div data-ut-section data-ut-variant="pill" data-ut-orientation="vertical" data-ut-side="left">
        <div data-ut-list id="outer-list">
          <button data-ut-tab id="outer-tab">Outer</button>
        </div>
        <div data-ut-panel>
          <div data-ut-section data-ut-variant="pill">
            <div data-ut-scroller>
              <div data-ut-list id="inner-list">
                <button data-ut-tab id="inner-tab">Inner</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    expect(styleOf(window, "outer-list").borderRadius).toBe("12px");
    expect(styleOf(window, "outer-list").flexDirection).toBe("column");
    expect(styleOf(window, "outer-tab").borderRadius).toBe("8px");
    expect(styleOf(window, "inner-list").borderRadius).toBe("9999px");
    expect(styleOf(window, "inner-list").flexDirection).not.toBe("column");
    expect(styleOf(window, "inner-tab").borderRadius).toBe("9999px");
  });

  it("does not match an inner active tab from the outer bordered rule", () => {
    const window = render(`
      <div data-ut-section data-ut-variant="bordered" id="outer">
        <div data-ut-scroller>
          <div data-ut-list>
            <button data-ut-tab data-ut-active id="outer-tab">Outer</button>
          </div>
        </div>
        <div data-ut-panel>
          <div data-ut-section data-ut-variant="pill" id="inner">
            <div data-ut-list>
              <button data-ut-tab data-ut-active id="inner-tab">Inner</button>
            </div>
          </div>
        </div>
      </div>
    `);
    const doc = window.document;
    const bordered =
      '[data-ut-variant="bordered"] > :where([data-ut-scroller]) > :where([data-ut-list]) > [data-ut-tab][data-ut-active]';
    const pill = '[data-ut-variant="pill"] > [data-ut-list] > :where([data-ut-tab])';

    expect(doc.getElementById("outer-tab")?.matches(bordered)).toBe(true);
    expect(doc.getElementById("inner-tab")?.matches(bordered)).toBe(false);
    expect(doc.getElementById("inner-tab")?.matches(pill)).toBe(true);
    expect(styleOf(window, "inner-tab").borderRadius).toBe("9999px");
  });

  it("lets a two-attribute override win, same as before the scoping change", () => {
    const window = render(
      `
      <div data-ut-section data-ut-variant="pill">
        <div data-ut-list>
          <button data-ut-tab id="tab">A</button>
        </div>
      </div>
    `,
      "[data-ut-section] [data-ut-tab] { border-radius: 4px; }",
    );
    expect(styleOf(window, "tab").borderRadius).toBe("4px");
  });
});
