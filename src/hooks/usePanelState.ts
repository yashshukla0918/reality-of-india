import { useState } from "react";

export function usePanelState() {
  const [panelOpen, setPanelOpen] = useState<boolean>(false);

  const togglePanel = () => {
    setPanelOpen((prev) => !prev);
  };

  const closePanel = () => {
    setPanelOpen(false);
  };

  return { panelOpen, togglePanel, closePanel };
}
