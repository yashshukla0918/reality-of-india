import { useEffect, useRef, useState } from "react";
import L from "leaflet";

export function useMapInitialization({ isDarkMode }: { isDarkMode: boolean }) {
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (mapRef.current) return;

    const initialLabel = isDarkMode ? "dark" : "light";
    const map = L.map("map", {
      renderer: L.canvas(),
      preferCanvas: true,
      minZoom: 4,
      maxZoom: 12,
      attributionControl: false,
    }).setView([18.9734, 80.6569], 4);

    const tileLayer = L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/${initialLabel}_all/{z}/{x}/{y}{r}.png`,
      {
        attribution: "© CartoDB",
      }
    );
    tileLayer.addTo(map);

    tileLayerRef.current = tileLayer;
    mapRef.current = map;
    setIsInitialized(true);

    return () => {
      tileLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!tileLayerRef.current) return;

    const label = isDarkMode ? "dark" : "light";
    tileLayerRef.current.setUrl(
      `https://{s}.basemaps.cartocdn.com/${label}_all/{z}/{x}/{y}{r}.png`
    );
  }, [isDarkMode]);

  return { mapRef, isInitialized };
}
