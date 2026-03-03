import { useMemo } from "react";
import type { NetworkInfo } from "./networkData";

export type DragOffset = { x: number; y: number };

export type PositionedNetwork = NetworkInfo & {
  key: string;
  side: "left" | "right";
  hasData: boolean;
  nodeX: number;
  nodeY: number;
  nodeStyle: React.CSSProperties;
};

type NetworkCard = NetworkInfo & {
  key: string;
  hasData: boolean;
};

type ViewportSize = {
  width: number;
  height: number;
};

export const useNodeNetworkLayout = ({
  networkCards,
  dragOffsets,
  isDistrictMode,
  viewportSize,
}: {
  networkCards: NetworkCard[];
  dragOffsets: Record<string, DragOffset>;
  isDistrictMode: boolean;
  viewportSize: ViewportSize;
}) => {
  const positionedNetworks = useMemo<PositionedNetwork[]>(() => {
    const horizontalScale =
      viewportSize.width < 480
        ? 0.46
        : viewportSize.width < 640
          ? 0.58
          : viewportSize.width < 768
            ? 0.68
            : viewportSize.width < 1024
              ? 0.82
              : 1;
    const verticalScale =
      viewportSize.height < 640 ? 0.7 : viewportSize.height < 820 ? 0.86 : 1;
    const spreadScale = Math.min(horizontalScale, verticalScale);
    const dataNetworks = networkCards.filter((network) => network.hasData);
    const noDataNetworks = networkCards.filter((network) => !network.hasData);

    const dataLeftCount = Math.ceil(dataNetworks.length / 2);
    const dataRightCount = Math.floor(dataNetworks.length / 2);
    const viewportHalf = viewportSize.width / 2;
    const safePadding = viewportSize.width < 480 ? 8 : viewportSize.width < 768 ? 10 : 14;
    const dataNodeHalfWidth =
      viewportSize.width < 480 ? 73 : viewportSize.width < 768 ? 82 : viewportSize.width < 900 ? 97 : 112;
    const noDataNodeHalfWidth =
      viewportSize.width < 480 ? 62 : viewportSize.width < 768 ? 70 : viewportSize.width < 900 ? 80 : 88;
    const maxDataOffset = Math.max(32, viewportHalf - dataNodeHalfWidth - safePadding);
    const maxNoDataOffset = Math.max(28, viewportHalf - noDataNodeHalfWidth - safePadding);
    const leftBaseX = (isDistrictMode ? -250 : -290) * horizontalScale;
    const rightBaseX = (isDistrictMode ? 290 : 340) * horizontalScale;
    const leftX = -Math.min(Math.abs(leftBaseX), maxDataOffset);
    const rightX = Math.min(Math.abs(rightBaseX), maxDataOffset);
    const dataVerticalSpread = (isDistrictMode ? 360 : 430) * spreadScale;
    const noDataBaseX = (isDistrictMode ? -460 : -520) * horizontalScale;
    const noDataX = -Math.min(Math.abs(noDataBaseX), maxNoDataOffset);
    const noDataVerticalSpread = (isDistrictMode ? 260 : 320) * spreadScale;
    let dataLeftIndex = 0;
    let dataRightIndex = 0;

    const clampNodeX = (value: number, hasData: boolean) => {
      const halfWidth = hasData ? dataNodeHalfWidth : noDataNodeHalfWidth;
      const minX = -(viewportHalf - halfWidth - safePadding);
      const maxX = viewportHalf - halfWidth - safePadding;
      return Math.min(maxX, Math.max(minX, value));
    };

    const arrangedData = dataNetworks.map((network, index) => {
      const nodeKey = network.key;
      const isLeft = index % 2 === 0 && dataLeftCount > 0;
      const sideTotal = isLeft ? dataLeftCount : dataRightCount;
      const sideIndex = isLeft ? dataLeftIndex++ : dataRightIndex++;
      const step = sideTotal > 1 ? dataVerticalSpread / (sideTotal - 1) : 0;
      const baseY = sideTotal > 1 ? -dataVerticalSpread / 2 + sideIndex * step : 0;
      const baseX = isLeft ? leftX : rightX;
      const dragOffset = dragOffsets[nodeKey] ?? { x: 0, y: 0 };
      const nodeX = clampNodeX(baseX + dragOffset.x, true);
      const nodeY = baseY + dragOffset.y;

      return {
        ...network,
        key: nodeKey,
        side: (isLeft ? "left" : "right") as "left" | "right",
        hasData: true,
        nodeX,
        nodeY,
        nodeStyle: {
          transform: `translate(calc(-50% + ${nodeX}px), calc(-50% + ${nodeY}px))`,
        },
      };
    });

    const arrangedNoData = noDataNetworks.map((network, index) => {
      const nodeKey = network.key;
      const step =
        noDataNetworks.length > 1
          ? noDataVerticalSpread / (noDataNetworks.length - 1)
          : 0;
      const baseY =
        noDataNetworks.length > 1
          ? -noDataVerticalSpread / 2 + index * step
          : 0;
      const dragOffset = dragOffsets[nodeKey] ?? { x: 0, y: 0 };
      const nodeX = clampNodeX(noDataX + dragOffset.x, false);
      const nodeY = baseY + dragOffset.y;

      return {
        ...network,
        key: nodeKey,
        side: "left" as const,
        hasData: false,
        nodeX,
        nodeY,
        nodeStyle: {
          transform: `translate(calc(-50% + ${nodeX}px), calc(-50% + ${nodeY}px))`,
        },
      };
    });

    return [...arrangedData, ...arrangedNoData];
  }, [dragOffsets, isDistrictMode, networkCards, viewportSize.height, viewportSize.width]);

  const subnodeLayout = useMemo(
    () => ({
      startOffsetX:
        viewportSize.width < 480
          ? 132
          : viewportSize.width < 768
            ? 152
            : viewportSize.width < 1024
              ? 164
              : 184,
      columnGap:
        viewportSize.width < 480
          ? 116
          : viewportSize.width < 768
            ? 132
            : viewportSize.width < 1024
              ? 148
              : 172,
      rowGap:
        viewportSize.width < 480
          ? 46
          : viewportSize.width < 768
            ? 50
            : viewportSize.width < 1024
              ? 52
              : 56,
    }),
    [viewportSize.width]
  );

  return { positionedNetworks, subnodeLayout };
};
