export type TabPath = string;

export type Orientation = "horizontal" | "vertical";

export type Variant = "underline" | "pill" | "bordered";

export type Justify = "start" | "center" | "end" | "between" | "around" | "evenly";

export type Side = "left" | "right";

export type Persist = "session" | "local";

export type Transition = "fade" | "slide";

export type TabChangeHandler = (path: TabPath, prevPath: TabPath | null) => void;
export type TabBeforeChangeHandler = (path: TabPath, prevPath: TabPath | null) => boolean | void;

export interface TabsConfig {
  el: HTMLElement | string;
  defaultPath?: TabPath;
  orientation?: Orientation;
  variant?: Variant;
  justify?: Justify;
  side?: Side;
  syncUrl?: boolean;
  persist?: Persist;
  overflow?: boolean;
  transition?: Transition;
  equalHeight?: boolean;
  equalPanelHeight?: boolean;
  /**
   * @deprecated Use `beforeChange`. Still called before the switch and can
   * return `false` to cancel. Passing it logs a one-time warning outside production.
   */
  onChange?: TabBeforeChangeHandler;
  /** Called before state change. Return false to cancel the switch. */
  beforeChange?: TabBeforeChangeHandler;
  /** Called after state change and all listeners have been notified. */
  afterChange?: TabChangeHandler;
}

export interface TabsInstance {
  /** Active tab path. Empty only when the widget has no selectable tab. */
  getPath(): TabPath;
  setPath(path: TabPath): void;
  destroy(): void;
  /** Subscribe to a hook. Returns an unsubscribe function. */
  on(event: "beforeChange", handler: TabBeforeChangeHandler): () => void;
  on(event: "change" | "afterChange", handler: TabChangeHandler): () => void;
  /** Unsubscribe a previously registered handler. */
  off(event: "beforeChange", handler: TabBeforeChangeHandler): void;
  off(event: "change" | "afterChange", handler: TabChangeHandler): void;
}

export interface TabSection {
  root: HTMLElement;
  list: HTMLElement;
  tabs: HTMLElement[];
  panels: HTMLElement[];
  /** Maps tab index to its panel. Value matches win; everything else stays index-paired. */
  tabPanelMap: Map<number, HTMLElement>;
}
