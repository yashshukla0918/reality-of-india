import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import { loadDistricts, getDistrictsByState } from "../services/dataService";
import { useDataLoading } from "../components/DataLoadingProvider/DataLoadingContext";
import type { SelectionState } from "../types/geo";

interface UseDistrictLayerProps {
  mapRef: React.MutableRefObject<L.Map | null>;
  selectionState: SelectionState;
  onDistrictSelect: (districtName: string, stateName: string) => void;
}

export function useDistrictLayer({
  mapRef,
  selectionState,
  onDistrictSelect,
}: UseDistrictLayerProps) {
  const districtLayerRef = useRef<L.GeoJSON | null>(null);
  const loadedStateRef = useRef<string | null>(null);
  const [districtsLoaded, setDistrictsLoaded] = useState(false);
  const { setError } = useDataLoading();

  // Load and display districts when state is selected
  useEffect(() => {
    if (!mapRef.current || !selectionState.selectedState) {
      if (districtLayerRef.current) {
        mapRef.current?.removeLayer(districtLayerRef.current);
        districtLayerRef.current = null;
        loadedStateRef.current = null;
      }
      return;
    }

    // If same state, skip recreation - only styling will update
    if (loadedStateRef.current === selectionState.selectedState) {
      return;
    }

    const loadDistrictLayer = async () => {
      try {
        await loadDistricts();
        const districts = getDistrictsByState(selectionState.selectedState!);

        // Remove old district layer if it exists
        if (districtLayerRef.current) {
          mapRef.current?.removeLayer(districtLayerRef.current);
          districtLayerRef.current = null;
        }

        if (districts.length > 0) {
          const districtGeoJSON = {
            type: "FeatureCollection" as const,
            features: districts,
          };

          const layer = L.geoJSON(districtGeoJSON, {
            style: {
              color: "#64748b",
              weight: 1.5,
              fillOpacity: 0.05,
              fillColor: "#64748b",
              opacity: 0.2,
            },
            onEachFeature: (feature, featureLayer) => {
              const districtName = feature.properties.DISTRICT;

              featureLayer.on("mouseover", () => {
                if (selectionState.selectedDistrict !== districtName) {
                  (featureLayer as L.Path).setStyle({
                    color: "#22c55e",
                    weight: 2.5,
                    opacity: 0.9,
                  });
                }
              });

              featureLayer.on("mouseout", () => {
                if (selectionState.selectedDistrict !== districtName) {
                  (featureLayer as L.Path).setStyle({
                    color: "#64748b",
                    weight: 1.5,
                    opacity: 0.2,
                  });
                }
              });

              featureLayer.on("click", () => {
                onDistrictSelect(districtName, feature.properties.ST_NM);
              });
            },
          }).addTo(mapRef.current!);

          districtLayerRef.current = layer;
          loadedStateRef.current = selectionState.selectedState;
          setDistrictsLoaded(true);
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load districts";
        setError(errorMsg);
        console.error("Error loading districts:", err);
        setDistrictsLoaded(false);
      }
    };

    loadDistrictLayer();
  }, [selectionState.selectedState, onDistrictSelect, setError]);

  // Memoized function to update district styling
  const updateDistrictStyles = useCallback(() => {
    if (!districtLayerRef.current || !districtsLoaded) return;

    requestAnimationFrame(() => {
      (districtLayerRef.current as L.GeoJSON).eachLayer((layer: any) => {
        const districtName = layer.feature.properties.DISTRICT;
        if (districtName === selectionState.selectedDistrict) {
          layer.setStyle({
            color: "#22c55e",
            weight: 3.5,
            fillOpacity: 0.25,
            opacity: 1,
          });
        } else {
          layer.setStyle({
            color: "#64748b",
            weight: 1.5,
            fillOpacity: 0.05,
            opacity: 0.2,
          });
        }
      });
    });
  }, [selectionState.selectedDistrict, districtsLoaded]);

  // Update district styling when selection changes
  useEffect(() => {
    updateDistrictStyles();
  }, [updateDistrictStyles]);

  // Fit district bounds when district is selected
  useEffect(() => {
    if (
      !mapRef.current ||
      !selectionState.selectedDistrict ||
      !districtLayerRef.current ||
      !districtsLoaded
    )
      return;

    // Use setTimeout to ensure the layer is fully rendered before getting bounds
    const timer = setTimeout(() => {
      (districtLayerRef.current as L.GeoJSON).eachLayer((layer: any) => {
        if (
          layer.feature.properties.DISTRICT === selectionState.selectedDistrict
        ) {
          const bounds = L.geoJSON(layer.feature).getBounds();
          mapRef.current?.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 10,
            animate: true,
            duration: 0.8,
          });
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [selectionState.selectedDistrict, districtsLoaded]);

  return { districtLayerRef, districtsLoaded };
}
