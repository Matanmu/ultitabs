export { createTabs } from "./tabs";
export type { TabPath, TabsConfig, TabsInstance, Orientation, Variant, Justify, Side, Persist } from "./types";

import { createTabs } from "./tabs";

// Auto-init: scan for [data-ut-section][data-ut-auto] and initialize automatically
if (typeof document !== "undefined") {
  const init = () => {
    document.querySelectorAll<HTMLElement>("[data-ut-section][data-ut-auto]").forEach((el) => {
      if (el.dataset.utInitialized) return;
      el.dataset.utInitialized = "1";
      createTabs({ el });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
