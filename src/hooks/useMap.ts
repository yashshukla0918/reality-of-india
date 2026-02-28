import { useEffect, useRef } from "react";
import L from "leaflet";

export function useMap() {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("map", {
        renderer: L.canvas(),
        preferCanvas: true,
        minZoom: 4,
        maxZoom: 12
      }).setView([22.9734, 78.6569], 5);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      ).addTo(map);

      mapRef.current = map;
    }
  }, []);

  return mapRef;
}