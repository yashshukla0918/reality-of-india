import { useState, useCallback } from "react";
import type { SelectionState } from "../types/geo";

export function useSelectionState() {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedState: null,
    selectedDistrict: null,
    selectedStateName: null,
  });

  const handleStateSelect = useCallback((stateName: string) => {
    setSelectionState({
      selectedState: stateName,
      selectedDistrict: null,
      selectedStateName: stateName,
    });
  }, []);

  const handleDistrictSelect = useCallback(
    (districtName: string, stateName: string) => {
      setSelectionState({
        selectedState: stateName,
        selectedDistrict: districtName,
        selectedStateName: stateName,
      });
    },
    []
  );

  const handleReset = useCallback(() => {
    setSelectionState({
      selectedState: null,
      selectedDistrict: null,
      selectedStateName: null,
    });
  }, []);

  return {
    selectionState,
    handleStateSelect,
    handleDistrictSelect,
    handleReset,
  };
}
