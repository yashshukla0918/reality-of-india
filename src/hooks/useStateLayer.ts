import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import { loadStates } from "../services/dataService";
import { useDataLoading } from "../components/DataLoadingProvider/DataLoadingContext";
import type { StateFeature, SelectionState } from "../types/geo";

interface UseStateLayerProps {
  mapRef: React.MutableRefObject<L.Map | null>;
  isInitialized: boolean;
  selectionState: SelectionState;
  onStateSelect: (stateName: string) => void;
}

export function useStateLayer({
  mapRef,
  isInitialized,
  selectionState,
  onStateSelect,
}: UseStateLayerProps) {
  const stateLayersRef = useRef<Record<string, L.GeoJSON>>({});
  const hoverTimersRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
  const { setIsLoading, setError } = useDataLoading();

  // Load and display states
  useEffect(() => {
    if (!mapRef.current || !isInitialized) return;

    const loadStateLayer = async () => {
      try {
        const states = await loadStates();

        states.forEach((stateFeature: StateFeature) => {
          const stateName =
            stateFeature.properties.NAME_1 || stateFeature.properties.st_nm || "";

          // Skip if already loaded
          if (stateLayersRef.current[stateName]) return;

          const layer = L.geoJSON(stateFeature, {
            style: {
              color: "#475569",
              weight: 1.5,
              fillOpacity: 0.05,
              fillColor: "#475569",
              opacity: 0.15,
            },
            onEachFeature: (_feature, featureLayer) => {
              featureLayer.on("mouseover", () => {
                if (selectionState.selectedState !== stateName) {
                  // Clear any pending hover timer
                  if (hoverTimersRef.current[stateName]) {
                    clearTimeout(hoverTimersRef.current[stateName]);
                  }

                  (featureLayer as L.Path).setStyle({
                    color: "#fbbf24",
                    weight: 2.5,
                    opacity: 0.8,
                  });
                }
              });

              featureLayer.on("mouseout", () => {
                if (selectionState.selectedState !== stateName) {
                  // Debounce the mouseout to prevent flickering
                  hoverTimersRef.current[stateName] = setTimeout(() => {
                    (featureLayer as L.Path).setStyle({
                      color: "#475569",
                      weight: 1.5,
                      opacity: 0.15,
                    });
                  }, 50);
                }
              });

              featureLayer.on("click", () => {
                onStateSelect(stateName);
              });
            },
          }).addTo(mapRef.current!);

          stateLayersRef.current[stateName] = layer;
        });

        setIsLoading(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to load states";
        setError(errorMsg);
        setIsLoading(false);
        console.error("Error loading states:", err);
      }
    };

    loadStateLayer();
  }, [isInitialized, onStateSelect, setIsLoading, setError]);

  // Memoized function to update state styling
  const updateStateStyles = useCallback(() => {
    requestAnimationFrame(() => {
      Object.entries(stateLayersRef.current).forEach(([stateName, layer]) => {
        if (stateName === selectionState.selectedState) {
          if (!selectionState.selectedDistrict) {
            (layer as any).setStyle({
              color: "#fbbf24",
              weight: 3.5,
              fillOpacity: 0.2,
              opacity: 1,
            });
          } else {
            (layer as any).setStyle({
              color: "#f59e0b",
              weight: 2.5,
              fillOpacity: 0.1,
              opacity: 0.6,
            });
          }
        } else {
          (layer as any).setStyle({
            color: "#475569",
            weight: 1.5,
            fillOpacity: 0.05,
            opacity: 0.15,
          });
        }
      });
    });
  }, [selectionState.selectedState, selectionState.selectedDistrict]);

  // Update state styling when selection changes
  useEffect(() => {
    updateStateStyles();
  }, [updateStateStyles]);

  // Fit state bounds when state is selected
  useEffect(() => {
    if (
      !mapRef.current ||
      !selectionState.selectedState ||
      selectionState.selectedDistrict
    ) {
      return;
    }

    requestAnimationFrame(() => {
      const stateLayer = stateLayersRef.current[selectionState.selectedState!];
      if (stateLayer) {
        const bounds = stateLayer.getBounds();
        mapRef.current?.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 7,
          animate: true,
          duration: 0.8,
        });
      }
    });
  }, [selectionState.selectedState, selectionState.selectedDistrict]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(hoverTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  return { stateLayersRef };
}
