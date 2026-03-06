export type TabPath = string;

export type Orientation = "horizontal" | "vertical";

export type Variant = "underline" | "pill" | "bordered";

export type Justify = "start" | "center" | "end" | "between" | "around" | "evenly";

export type Side = "left" | "right";

export type Persist = "session" | "local";

export type Transition = "fade" | "slide";

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
  onChange?: (path: TabPath, prevPath: TabPath | null) => boolean | void;
}

export interface TabsInstance {
  getPath(): TabPath;
  setPath(path: TabPath): void;
  destroy(): void;
  on(event: "change", handler: (path: TabPath, prevPath: TabPath | null) => void): () => void;
}

export interface TabSection {
  root: HTMLElement;
  list: HTMLElement;
  tabs: HTMLElement[];
  panels: HTMLElement[];
}
