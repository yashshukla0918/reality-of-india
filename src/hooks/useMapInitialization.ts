import { useEffect, useRef, useState } from "react";
import L from "leaflet";

export function useMapInitialization({ isDarkMode }: { isDarkMode: boolean }) {
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized || mapRef.current) return;

    const label = isDarkMode ? "dark" : "light";
    const map = L.map("map", {
      renderer: L.canvas(),
      preferCanvas: true,
      minZoom: 4,
      maxZoom: 12,
      attributionControl: false,
    }).setView([22.9734, 78.6569], 5);

    const tileLayer = L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/${label}_all/{z}/{x}/{y}{r}.png`,
      {
        attribution: "© CartoDB",
      }
    );
    tileLayer.addTo(map);

    tileLayerRef.current = tileLayer;
    mapRef.current = map;
    setIsInitialized(true);
  }, [isInitialized, isDarkMode]);

  useEffect(() => {
    if (!isInitialized || !tileLayerRef.current) return;

    const label = isDarkMode ? "dark" : "light";
    tileLayerRef.current.setUrl(
      `https://{s}.basemaps.cartocdn.com/${label}_all/{z}/{x}/{y}{r}.png`
    );
  }, [isDarkMode, isInitialized]);

  return { mapRef, isInitialized };
}
