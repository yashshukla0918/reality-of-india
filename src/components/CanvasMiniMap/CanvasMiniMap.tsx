import { useEffect, useRef, useState } from "react";
import {
  getStateByName,
  getDistrictByName,
  getDistrictsByState,
} from "../../services/dataService";
import "./CanvasMiniMap.css";

interface CanvasMiniMapProps {
  selectedState: string | null;
  selectedDistrict: string | null;
}

export default function CanvasMiniMap({
  selectedState,
  selectedDistrict,
}: CanvasMiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [resizeTick, setResizeTick] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const observer = new ResizeObserver(() => {
      setResizeTick((prev) => prev + 1);
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !selectedState) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw at the rendered CSS size to stay crisp on all breakpoints.
    const size = Math.max(120, Math.floor(canvas.clientWidth || 200));
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size * pixelRatio);
    canvas.height = Math.floor(size * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, size, size);

    // Fill background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, size, size);

    // Add padding for the drawing area (increased for safety margin)
    const padding = 20;

    // Helper function to convert geographic coordinates to canvas coordinates
    const projectCoordinates = (
      lon: number,
      lat: number,
      bounds: any
    ): [number, number] => {
      const minLon = bounds.minLon;
      const maxLon = bounds.maxLon;
      const minLat = bounds.minLat;
      const maxLat = bounds.maxLat;

      const drawWidth = size - 2 * padding;
      const drawHeight = size - 2 * padding;

      // Add a small scaling factor to ensure padding on all sides
      const scaleFactor = 0.95;
      const scaledWidth = drawWidth * scaleFactor;
      const scaledHeight = drawHeight * scaleFactor;
      const offsetX = (drawWidth - scaledWidth) / 2;
      const offsetY = (drawHeight - scaledHeight) / 2;

      const x =
        padding +
        offsetX +
        ((lon - minLon) / (maxLon - minLon)) * scaledWidth;
      const y =
        size -
        padding -
        offsetY -
        ((lat - minLat) / (maxLat - minLat)) * scaledHeight;

      return [x, y];
    };

    // Helper function to calculate bounds
    const calculateBounds = (geometry: any) => {
      let minLon = Infinity,
        maxLon = -Infinity;
      let minLat = Infinity,
        maxLat = -Infinity;

      const processCoords = (coords: any) => {
        if (Array.isArray(coords[0])) {
          coords.forEach(processCoords);
        } else if (typeof coords[0] === "number") {
          const [lon, lat] = coords;
          minLon = Math.min(minLon, lon);
          maxLon = Math.max(maxLon, lon);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        }
      };

      if (geometry.type === "Polygon") {
        geometry.coordinates.forEach(processCoords);
      } else if (geometry.type === "MultiPolygon") {
        geometry.coordinates.forEach((polygon: any) => {
          polygon.forEach(processCoords);
        });
      }

      return { minLon, maxLon, minLat, maxLat };
    };

    // Helper function to draw polygon
    const drawPolygon = (
      geometry: any,
      bounds: any,
      strokeColor: string,
      lineWidth: number,
      fillColor?: string
    ) => {
      const drawRing = (ring: any) => {
        if (ring.length === 0) return;

        const [startX, startY] = projectCoordinates(ring[0][0], ring[0][1], bounds);
        ctx.beginPath();
        ctx.moveTo(startX, startY);

        for (let i = 1; i < ring.length; i++) {
          const [x, y] = projectCoordinates(ring[i][0], ring[i][1], bounds);
          ctx.lineTo(x, y);
        }
        ctx.closePath();

        if (fillColor) {
          ctx.fillStyle = fillColor;
          ctx.fill();
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      };

      if (geometry.type === "Polygon") {
        geometry.coordinates.forEach(drawRing);
      } else if (geometry.type === "MultiPolygon") {
        geometry.coordinates.forEach((polygon: any) => {
          polygon.forEach(drawRing);
        });
      }
    };

    // Get state feature
    const stateFeature = getStateByName(selectedState);
    if (!stateFeature) return;

    let bounds = calculateBounds(stateFeature.geometry);

    // If district is selected, include it in bounds
    if (selectedDistrict) {
      const districtFeature = getDistrictByName(
        selectedDistrict,
        selectedState
      );
      if (districtFeature) {
        const districtBounds = calculateBounds(districtFeature.geometry);
        bounds = {
          minLon: Math.min(bounds.minLon, districtBounds.minLon),
          maxLon: Math.max(bounds.maxLon, districtBounds.maxLon),
          minLat: Math.min(bounds.minLat, districtBounds.minLat),
          maxLat: Math.max(bounds.maxLat, districtBounds.maxLat),
        };
      }
    }

    // Draw all districts with lower opacity (secondary)
    const districts = getDistrictsByState(selectedState);
    districts.forEach((district) => {
      drawPolygon(
        district.geometry,
        bounds,
        "#475569",
        0.5,
        undefined
      );
    });

    // Draw state boundary (primary)
    drawPolygon(stateFeature.geometry, bounds, "#60a5fa", 1.5);

    // Draw selected district with highlight
    if (selectedDistrict) {
      const districtFeature = getDistrictByName(
        selectedDistrict,
        selectedState
      );
      if (districtFeature) {
        drawPolygon(districtFeature.geometry, bounds, "#fbbf24", 1.2, "rgba(251, 191, 36, 0.3)");
      }
    }
  }, [resizeTick, selectedState, selectedDistrict]);

  if (!selectedState) return null;

  return (
    <div className="canvas-minimap-container">
      <canvas ref={canvasRef} className="canvas-minimap" />
    </div>
  );
}
