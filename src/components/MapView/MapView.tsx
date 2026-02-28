import { useEffect, useRef, useState, useCallback, memo } from "react";
import L from "leaflet";
import {
  loadStates,
  loadDistricts,
  loadIndiaBoundary,
  getDistrictsByState,
} from "../../services/dataService";
import { useDataLoading } from "../DataLoadingProvider/DataLoadingContext";
import type { StateFeature, SelectionState } from "../../types/geo";

interface MapViewProps {
  selectionState: SelectionState;
  onStateSelect: (stateName: string) => void;
  onDistrictSelect: (districtName: string, stateName: string) => void;
}

const MapViewComponent = ({
  selectionState,
  onStateSelect,
  onDistrictSelect,
}: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const stateLayersRef = useRef<Record<string, L.GeoJSON>>({});
  const districtLayerRef = useRef<L.GeoJSON | null>(null);
  const indiaLayerRef = useRef<L.GeoJSON | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { setIsLoading, setError } = useDataLoading();
  const hoverTimersRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
  const loadedStateRef = useRef<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (isInitialized || mapRef.current) return;

    const map = L.map("map", {
      renderer: L.canvas(),
      preferCanvas: true,
      minZoom: 4,
      maxZoom: 12,
      attributionControl: false,
    }).setView([22.9734, 78.6569], 5);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "© CartoDB",
      }
    ).addTo(map);

    mapRef.current = map;
    setIsInitialized(true);
  }, [isInitialized]);

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

          // Zoom to state bounds with smooth animation
          const bounds = layer.getBounds();
          mapRef.current?.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 8,
            animate: true,
            duration: 0.8,
          });
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load districts";
        setError(errorMsg);
        console.error("Error loading districts:", err);
      }
    };

    loadDistrictLayer();
  }, [selectionState.selectedState, onDistrictSelect, setError]);

  // Memoized function to update district styling
  const updateDistrictStyles = useCallback(() => {
    if (!districtLayerRef.current) return;

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
  }, [selectionState.selectedDistrict]);

  // Update district styling when selection changes
  useEffect(() => {
    updateDistrictStyles();
  }, [updateDistrictStyles]);

  // Fit district bounds when district is selected
  useEffect(() => {
    if (
      !mapRef.current ||
      !selectionState.selectedDistrict ||
      !districtLayerRef.current
    )
      return;

    requestAnimationFrame(() => {
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
    });
  }, [selectionState.selectedDistrict]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(hoverTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  return <div id="map"></div>;
};

export default memo(MapViewComponent);
