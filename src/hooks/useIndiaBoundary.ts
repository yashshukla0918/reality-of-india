import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import { loadIndiaBoundary } from "../services/dataService";
import { useDataLoading } from "../components/DataLoadingProvider/DataLoadingContext";
import type { SelectionState } from "../types/geo";

export function useIndiaBoundary(
  mapRef: React.MutableRefObject<L.Map | null>,
  isInitialized: boolean,
  selectionState: SelectionState
) {
  const indiaLayerRef = useRef<L.GeoJSON | null>(null);
  const { setError } = useDataLoading();

  // Load and display India boundary
  useEffect(() => {
    if (!mapRef.current || !isInitialized) return;

    const loadBoundary = async () => {
      try {
        const data = await loadIndiaBoundary();
        if (data) {
          const layer = L.geoJSON(data, {
            style: {
              color: "#3b82f6",
              weight: 3,
              fillOpacity: 0,
              opacity: 0.6,
            },
          }).addTo(mapRef.current!);
          indiaLayerRef.current = layer;
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load India boundary";
        setError(errorMsg);
        console.error("Error loading India boundary:", err);
      }
    };

    loadBoundary();
  }, [isInitialized, setError]);

  // Memoized function to update India boundary styling
  const updateIndiaBoundaryStyle = useCallback(() => {
    if (!indiaLayerRef.current) return;

    let opacity = 0.15;
    let weight = 2;
    let color = "#64748b";

    if (selectionState.selectedDistrict) {
      opacity = 0.2;
      weight = 2;
      color = "#475569";
    } else if (selectionState.selectedState) {
      opacity = 0.4;
      weight = 2.5;
      color = "#0ea5e9";
    }

    requestAnimationFrame(() => {
      (indiaLayerRef.current as L.GeoJSON).eachLayer((layer: any) => {
        layer.setStyle({
          color,
          weight,
          opacity,
          fillOpacity: 0,
        });
      });
    });
  }, [selectionState.selectedState, selectionState.selectedDistrict]);

  // Update India boundary styling based on selection
  useEffect(() => {
    updateIndiaBoundaryStyle();
  }, [updateIndiaBoundaryStyle]);

  return { indiaLayerRef };
}
