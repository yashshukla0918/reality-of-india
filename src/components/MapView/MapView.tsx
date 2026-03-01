import { memo } from "react";
import { useMapInitialization } from "../../hooks/useMapInitialization";
import { useIndiaBoundary } from "../../hooks/useIndiaBoundary";
import { useStateLayer } from "../../hooks/useStateLayer";
import { useDistrictLayer } from "../../hooks/useDistrictLayer";
import type { SelectionState } from "../../types/geo";

interface MapViewProps {
  selectionState: SelectionState;
  onStateSelect: (stateName: string) => void;
  onDistrictSelect: (districtName: string, stateName: string) => void;
  isDarkMode: boolean;
}

const MapViewComponent = ({
  selectionState,
  onStateSelect,
  onDistrictSelect,
  isDarkMode
}: MapViewProps) => {
  // Initialize map with canvas rendering
  const { mapRef, isInitialized } = useMapInitialization({ isDarkMode });

  // Load and manage India boundary layer
  useIndiaBoundary(mapRef, isInitialized, selectionState);

  // Load and manage state layers
  useStateLayer({
    mapRef,
    isInitialized,
    selectionState,
    onStateSelect,
  });

  // Load and manage district layers
  useDistrictLayer({
    mapRef,
    selectionState,
    onDistrictSelect,
  });

  return <div id="map"></div>;
};

export default memo(MapViewComponent);
