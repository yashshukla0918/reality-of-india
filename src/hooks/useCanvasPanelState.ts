import { useState, useCallback } from "react";

export function useCanvasPanelState() {
  const [canvasPanelOpen, setCanvasPanelOpen] = useState<boolean>(false);

  const openCanvasPanel = useCallback(() => {
    setCanvasPanelOpen(true);
  }, []);

  const closeCanvasPanel = useCallback(() => {
    setCanvasPanelOpen(false);
  }, []);

  const toggleCanvasPanel = useCallback(() => {
    setCanvasPanelOpen((prev) => !prev);
  }, []);

  return {
    canvasPanelOpen,
    openCanvasPanel,
    closeCanvasPanel,
    toggleCanvasPanel,
  };
}
