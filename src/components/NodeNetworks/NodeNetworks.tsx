import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SelectionState } from "../../types/geo";
import { EvaluationReferenceIndex } from "../../constants/indicators/evaludation-reference-index";
import {
  useDistrictEvaluation,
  useStateEvaluation,
} from "../../services/evaluation/services";
import type { DistrictEvaluation } from "../../types/evaluation";
import "./NodeNetworks.css";

type NodeNetworksProps = {
  children?: React.ReactNode;
  className: string;
  selectionState: SelectionState;
};

type NetworkInfo = {
  name: string;
  nodes: number | null;
  indicators: { name: string; score: number | null }[];
};

type DragOffset = { x: number; y: number };
type CategoryItem = DistrictEvaluation["evaluation"][number];
type EvaluationReferenceItem = (typeof EvaluationReferenceIndex)[number];

type PositionedNetwork = NetworkInfo & {
  key: string;
  side: "left" | "right";
  hasData: boolean;
  nodeX: number;
  nodeY: number;
  nodeStyle: React.CSSProperties;
};

const normalizeKey = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");

const indicatorNameAliases = new Map<string, string>([
  ["median income index", "Median income (PPP-adjusted)"],
  ["employment rate", "Employment rate / job market depth"],
  ["income equality index", "Income inequality (Gini coefficient)"],
  ["housing affordability", "Housing affordability index"],
  ["life expectancy index", "Life expectancy"],
  ["infant mortality rate", "Infant mortality rate"],
  ["healthcare access", "Access to primary & emergency care"],
  ["air quality index score", "Air quality index (AQI)"],
  ["mental health support", "Mental health support availability"],
  ["literacy rate", "Literacy rate"],
  ["crime rate score", "Violent crime rate"],
  ["police trust index", "Police trust levels"],
  ["judicial efficiency", "Judicial efficiency"],
  ["public transport coverage", "Public transport coverage"],
  ["internet reliability", "Internet speed & reliability"],
  ["road quality index", "Road quality & congestion index"],
]);

const normalizeIndicatorLabel = (name: string) =>
  indicatorNameAliases.get(normalizeKey(name)) ?? name;

const referenceIndicatorsByCategory = EvaluationReferenceIndex.reduce(
  (map, category) => {
    map.set(
      category.label.toLowerCase(),
      category.indicators.map((indicator) => indicator.label)
    );
    return map;
  },
  new Map<string, string[]>()
);

const sortIndicatorsByReference = (
  categoryName: string,
  indicators: { name: string; score: number | null }[]
) => {
  const referenceIndicators =
    referenceIndicatorsByCategory.get(categoryName.toLowerCase()) ?? [];
  const indicatorIndexMap = new Map(
    referenceIndicators.map((label, index) => [normalizeKey(label), index])
  );

  return [...indicators].sort((a, b) => {
    const aIndex =
      indicatorIndexMap.get(normalizeKey(normalizeIndicatorLabel(a.name))) ??
      Number.MAX_SAFE_INTEGER;
    const bIndex =
      indicatorIndexMap.get(normalizeKey(normalizeIndicatorLabel(b.name))) ??
      Number.MAX_SAFE_INTEGER;
    if (aIndex === bIndex) {
      return a.name.localeCompare(b.name);
    }
    return aIndex - bIndex;
  });
};

const toCategoryNode = (category: CategoryItem): NetworkInfo => {
  const numericIndicators = category.indicators.filter(
    (indicator) => typeof indicator.score === "number"
  );
  const totalScore = category.indicators.reduce(
    (sum, indicator) =>
      sum + (typeof indicator.score === "number" ? indicator.score : 0),
    0
  );

  return {
    name: category.category,
    nodes:
      numericIndicators.length > 0
        ? Math.round(totalScore / numericIndicators.length)
        : null,
    indicators: sortIndicatorsByReference(category.category, category.indicators),
  };
};

const categoryIndexByLabel = EvaluationReferenceIndex.reduce(
  (indexMap, referenceCategory, index) => {
    indexMap.set(referenceCategory.label.toLowerCase(), index);
    return indexMap;
  },
  new Map<string, number>()
);

const orderedCategories = EvaluationReferenceIndex.map(
  (item): EvaluationReferenceItem["label"] => item.label
);

const sortByEvaluationReference = (a: NetworkInfo, b: NetworkInfo) => {
  const aIndex =
    categoryIndexByLabel.get(a.name.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
  const bIndex =
    categoryIndexByLabel.get(b.name.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
  return aIndex - bIndex;
};

const networksDataByStateAndDistrict = (
  sourceData: DistrictEvaluation[],
  selectedState: string,
  selectedDistrict?: string
): NetworkInfo[] => {
  if (!selectedState) return [];

  const state = selectedState.toLowerCase();
  const district = selectedDistrict?.toLowerCase();

  const stateRows = sourceData.filter((item) => item.state === state);
  if (stateRows.length === 0) return [];

  if (district) {
    const districtRow = stateRows.find((item) => item.district === district);
    if (!districtRow) return [];

    const categoryByLabel = new Map(
      districtRow.evaluation.map((category) => [
        category.category.toLowerCase(),
        toCategoryNode(category),
      ])
    );

    return orderedCategories
      .map((categoryLabel) => categoryByLabel.get(categoryLabel.toLowerCase()))
      .filter((category): category is NetworkInfo => Boolean(category));
  }

  const categoryAccumulator = new Map<
    string,
    {
      total: number;
      count: number;
      indicators: Map<
        string,
        { label: string; total: number; count: number; missing: number }
      >;
    }
  >();

  stateRows.forEach((row) => {
    row.evaluation.forEach((category) => {
      const categoryNode = toCategoryNode(category);
      const existing = categoryAccumulator.get(categoryNode.name);

      if (existing) {
        if (typeof categoryNode.nodes === "number") {
          existing.total += categoryNode.nodes;
          existing.count += 1;
        }

        categoryNode.indicators.forEach((indicator) => {
          const indicatorKey = normalizeKey(normalizeIndicatorLabel(indicator.name));
          const matchedIndicator = existing.indicators.get(indicatorKey);
          if (matchedIndicator) {
            if (typeof indicator.score === "number") {
              matchedIndicator.total += indicator.score;
              matchedIndicator.count += 1;
            } else {
              matchedIndicator.missing += 1;
            }
            return;
          }

          existing.indicators.set(indicatorKey, {
            label: normalizeIndicatorLabel(indicator.name),
            total: typeof indicator.score === "number" ? indicator.score : 0,
            count: typeof indicator.score === "number" ? 1 : 0,
            missing: typeof indicator.score === "number" ? 0 : 1,
          });
        });
      } else {
        const indicators = new Map<
          string,
          { label: string; total: number; count: number; missing: number }
        >();

        categoryNode.indicators.forEach((indicator) => {
          const indicatorLabel = normalizeIndicatorLabel(indicator.name);
          indicators.set(normalizeKey(indicatorLabel), {
            label: indicatorLabel,
            total: typeof indicator.score === "number" ? indicator.score : 0,
            count: typeof indicator.score === "number" ? 1 : 0,
            missing: typeof indicator.score === "number" ? 0 : 1,
          });
        });

        categoryAccumulator.set(categoryNode.name, {
          total: typeof categoryNode.nodes === "number" ? categoryNode.nodes : 0,
          count: typeof categoryNode.nodes === "number" ? 1 : 0,
          indicators,
        });
      }
    });
  });

  return Array.from(categoryAccumulator.entries())
    .map(([name, stats]) => {
      const indicators = Array.from(stats.indicators.values()).map((indicator) => ({
        name: indicator.label,
        score:
          indicator.count > 0 ? Math.round(indicator.total / indicator.count) : null,
      }));

      return {
        name,
        nodes: stats.count > 0 ? Math.round(stats.total / stats.count) : null,
        indicators: sortIndicatorsByReference(name, indicators),
      };
    })
    .sort(sortByEvaluationReference);
};

const NodeNetworks = ({
  children,
  className,
  selectionState,
}: NodeNetworksProps) => {
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 720,
  }));
  const [expandedParentKey, setExpandedParentKey] = useState<string | null>(null);
  const [isMobileIndicatorOpen, setIsMobileIndicatorOpen] = useState(true);
  const [dragOffsets, setDragOffsets] = useState<Record<string, DragOffset>>({});
  const [draggingNodeKey, setDraggingNodeKey] = useState<string | null>(null);
  const dragSessionRef = useRef<{
    key: string;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  const isDistrictMode = Boolean(selectionState.selectedDistrict);
  const accentColor = isDistrictMode ? "#22c55e" : "#fbbf24";
  const accentRgb = isDistrictMode ? "34, 197, 94" : "251, 191, 36";

  const selectedState = (selectionState.selectedState ?? "").toLowerCase();
  const selectedDistrict = (selectionState.selectedDistrict ?? "").toLowerCase();

  const {
    data: liveDistrictEvaluation,
    loading: isLoadingLiveData,
    stale: isLiveDataStale,
    error: liveDataError,
    sources: liveDataSources,
  } = useDistrictEvaluation(selectedState, selectedDistrict);

  const {
    data: liveStateEvaluation,
    loading: isLoadingStateData,
    stale: isStateDataStale,
    error: stateDataError,
    sources: stateDataSources,
  } = useStateEvaluation(selectedDistrict ? "" : selectedState);

  const activeEvaluation = selectedDistrict
    ? liveDistrictEvaluation
    : liveStateEvaluation;
  const activeLoading = selectedDistrict ? isLoadingLiveData : isLoadingStateData;
  const activeStale = selectedDistrict ? isLiveDataStale : isStateDataStale;
  const activeError = selectedDistrict ? liveDataError : stateDataError;
  const activeSources = selectedDistrict ? liveDataSources : stateDataSources;

  const evaluationSource = useMemo(() => {
    if (selectedState && activeEvaluation) {
      return [activeEvaluation];
    }
    return [];
  }, [selectedState, activeEvaluation]);

  const networksData = useMemo(
    () =>
      networksDataByStateAndDistrict(
        evaluationSource,
        selectedState,
        selectedDistrict
      ),
    [evaluationSource, selectedState, selectedDistrict]
  );

  const stopDragging = useCallback(() => {
    dragSessionRef.current = null;
    setDraggingNodeKey(null);
  }, []);

  const handleGlobalPointerMove = useCallback((event: PointerEvent) => {
    const session = dragSessionRef.current;
    if (!session) return;

    const deltaX = event.clientX - session.startX;
    const deltaY = event.clientY - session.startY;
    const nextOffset = { x: session.baseX + deltaX, y: session.baseY + deltaY };

    setDragOffsets((prev) => ({ ...prev, [session.key]: nextOffset }));
  }, []);

  const handleGlobalPointerUp = useCallback(() => {
    stopDragging();
  }, [stopDragging]);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [handleGlobalPointerMove, handleGlobalPointerUp]);

  const handleDragStart = useCallback(
    (key: string, event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const existingOffset = dragOffsets[key] ?? { x: 0, y: 0 };
      dragSessionRef.current = {
        key,
        startX: event.clientX,
        startY: event.clientY,
        baseX: existingOffset.x,
        baseY: existingOffset.y,
      };
      setDraggingNodeKey(key);
    },
    [dragOffsets]
  );

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
    const dataNetworks = networksData.filter((network) =>
      network.indicators.some((indicator) => typeof indicator.score === "number")
    );
    const noDataNetworks = networksData.filter(
      (network) =>
        !network.indicators.some((indicator) => typeof indicator.score === "number")
    );

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
      const nodeKey = `${network.name}-${index}`;
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
      const nodeKey = `${network.name}-na-${index}`;
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
  }, [dragOffsets, isDistrictMode, networksData, viewportSize.height, viewportSize.width]);

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

  const isMobileLayout = viewportSize.width <= 767;

  const mobileNetworkCards = useMemo(
    () =>
      networksData.map((network, index) => ({
        ...network,
        key: `${network.name}-${index}`,
        indicatorsWithData: network.indicators.filter(
          (indicator) => typeof indicator.score === "number"
        ).length,
      })),
    [networksData]
  );

  useEffect(() => {
    if (!expandedParentKey && mobileNetworkCards.length > 0) {
      setExpandedParentKey(mobileNetworkCards[0].key);
      return;
    }

    if (
      expandedParentKey &&
      !mobileNetworkCards.some((network) => network.key === expandedParentKey)
    ) {
      setExpandedParentKey(mobileNetworkCards[0]?.key ?? null);
    }
  }, [expandedParentKey, mobileNetworkCards]);

  useEffect(() => {
    if (!isMobileLayout) return;
    setIsMobileIndicatorOpen(true);
  }, [expandedParentKey, isMobileLayout]);

  const selectedMobileNetwork = useMemo(
    () => mobileNetworkCards.find((network) => network.key === expandedParentKey) ?? null,
    [expandedParentKey, mobileNetworkCards]
  );

  const sortedMobileIndicators = useMemo(() => {
    if (!selectedMobileNetwork) return [];
    return [...selectedMobileNetwork.indicators].sort((a, b) => {
      const aScore = typeof a.score === "number" ? a.score : Number.NEGATIVE_INFINITY;
      const bScore = typeof b.score === "number" ? b.score : Number.NEGATIVE_INFINITY;
      const aMissing = typeof a.score !== "number";
      const bMissing = typeof b.score !== "number";
      if (aMissing && bMissing) return a.name.localeCompare(b.name);
      if (aMissing) return 1;
      if (bMissing) return -1;
      if (aScore === bScore) return a.name.localeCompare(b.name);
      return bScore - aScore;
    });
  }, [selectedMobileNetwork]);

  const activeLinksCount = useMemo(
    () =>
      networksData.filter((network) =>
        network.indicators.some((indicator) => typeof indicator.score === "number")
      ).length,
    [networksData]
  );

  const selectedLabel =
    selectionState.selectedDistrict || selectionState.selectedState || "India";
  const dataSourceName =
    selectedState
      ? activeEvaluation
        ? activeStale
          ? `Evaluation Service (${activeSources.join(", ") || "partial"}, partial)`
          : `Evaluation Service (${activeSources.join(", ") || "live"})`
        : activeLoading
          ? "Evaluation Service (loading)"
          : activeError
            ? "Evaluation Service (unavailable)"
            : "No live source data"
      : "Select a state/district to load live sources";

  const showOverlay = Boolean(selectionState.selectedState);
  const overlayStyle = {
    "--network-accent": accentColor,
    "--network-accent-rgb": accentRgb,
  } as React.CSSProperties;

  return (
    <div className="node-networks-container">
      <div
        className={`node-networks-overlay ${
          isDistrictMode ? "district-mode" : "state-mode"
        }`}
        style={overlayStyle}
      >
        {showOverlay && (
          <>
            {!isMobileLayout && (
              <>
                <div className="network-glow-ring network-glow-ring-1"></div>
                <div className="network-glow-ring network-glow-ring-2"></div>

                {positionedNetworks.map((network) => {
                  const indicatorsWithData = network.indicators.filter(
                    (indicator) => typeof indicator.score === "number"
                  ).length;
                  const isExpanded = expandedParentKey === network.key;
                  const isDragging = draggingNodeKey === network.key;
                  const hasPrimaryFocus = expandedParentKey !== null;
                  const isSecondary = hasPrimaryFocus && !isExpanded;
                  const parentLayerStyle: React.CSSProperties = {
                    ...network.nodeStyle,
                    zIndex: isExpanded ? 12 : isSecondary ? 3 : 6,
                  };

                  return (
                    <div key={network.key}>
                      <div className="network-node" style={parentLayerStyle}>
                        <div
                          className={`network-node-chip ${network.side} ${
                            isDragging ? "dragging" : ""
                          } ${
                            isExpanded ? "primary" : ""
                          } ${
                            isSecondary ? "secondary" : ""
                          } ${
                            network.hasData ? "has-data" : "no-data"
                          }`}
                          onClick={() =>
                            setExpandedParentKey((current) =>
                              current === network.key ? null : network.key
                            )
                          }
                        >
                          <div
                            className="network-node-header"
                            onPointerDown={(event) => handleDragStart(network.key, event)}
                          >
                            <span className="network-node-name">{network.name}</span>
                            <span className="network-node-count">
                              {typeof network.nodes === "number" ? network.nodes : "N/A"}
                            </span>
                          </div>
                          <div className="network-node-toolbar">
                            <span className="network-node-meta">
                              {indicatorsWithData}/{network.indicators.length} indicators with data
                            </span>
                            <span className="network-node-clickhint">
                              {isExpanded ? "Hide details" : "Tap for details"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isExpanded &&
                        network.indicators.map((indicator, indicatorIndex) => {
                          const subKey = `${network.key}-sub-${indicatorIndex}`;
                          const subDragOffset = dragOffsets[subKey] ?? { x: 0, y: 0 };
                          const column = indicatorIndex % 2;
                          const row = Math.floor(indicatorIndex / 2);
                          const subBaseX =
                            network.side === "left"
                              ? subnodeLayout.startOffsetX + column * subnodeLayout.columnGap
                              : -subnodeLayout.startOffsetX - column * subnodeLayout.columnGap;
                          const subBaseY = row * subnodeLayout.rowGap - subnodeLayout.rowGap;
                          const subX = subBaseX + subDragOffset.x;
                          const subY = subBaseY + subDragOffset.y;
                          const subDragging = draggingNodeKey === subKey;
                          const linkLength = Math.max(
                            Math.hypot(subX, subY) - 36,
                            24
                          );
                          const linkAngle = (Math.atan2(subY, subX) * 180) / Math.PI;

                          return (
                            <div key={subKey} className="network-subnode-cluster">
                              <span
                                className="network-subnode-link"
                                style={{
                                  transform: `translate(calc(-50% + ${network.nodeX}px), calc(-50% + ${network.nodeY}px)) rotate(${linkAngle}deg)`,
                                  width: `${linkLength}px`,
                                }}
                              />
                              <div
                                className="network-subnode"
                                style={{
                                  transform: `translate(calc(-50% + ${network.nodeX + subX}px), calc(-50% + ${network.nodeY + subY}px))`,
                                  zIndex: 13,
                                }}
                              >
                                <div
                                  className={`network-subnode-chip ${
                                    subDragging ? "dragging" : ""
                                  }`}
                                  onPointerDown={(event) => handleDragStart(subKey, event)}
                                >
                                  <span className="network-subnode-label">{indicator.name}</span>
                                  <span className="network-subnode-value">
                                    {typeof indicator.score === "number"
                                      ? indicator.score
                                      : "N/A"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
              </>
            )}

            {isMobileLayout && (
              <div className="mobile-network-dock">
                <p className="mobile-network-summary">
                  {activeLoading
                    ? "Refreshing network indicators..."
                    : activeLinksCount > 0
                      ? `${activeLinksCount} categories with data for ${selectedLabel}`
                      : `No network data for ${selectedLabel}`}
                </p>
                <div className="mobile-network-scroll">
                  {mobileNetworkCards.map((network) => {
                    const isActive = selectedMobileNetwork?.key === network.key;
                    return (
                      <button
                        key={network.key}
                        type="button"
                        className={`mobile-network-card ${isActive ? "active" : ""}`}
                        onClick={() => setExpandedParentKey(network.key)}
                      >
                        <span className="mobile-network-card-title">{network.name}</span>
                        <span className="mobile-network-card-score">
                          {typeof network.nodes === "number" ? network.nodes : "N/A"}
                        </span>
                        <span className="mobile-network-card-meta">
                          {network.indicatorsWithData}/{network.indicators.length} indicators
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedMobileNetwork && (
                  <div className="mobile-network-indicators">
                    <div className="mobile-indicator-header">
                      <p className="mobile-indicator-heading">{selectedMobileNetwork.name}</p>
                      <button
                        type="button"
                        className="mobile-indicator-close-btn"
                        onClick={() => setIsMobileIndicatorOpen((prev) => !prev)}
                        aria-label={isMobileIndicatorOpen ? "Close indicators" : "Open indicators"}
                      >
                        {isMobileIndicatorOpen ? "Hide" : "Show"}
                      </button>
                    </div>
                    {isMobileIndicatorOpen && (
                    <div className="mobile-indicator-list">
                      {sortedMobileIndicators.map((indicator, indicatorIndex) => (
                        <div
                          className="mobile-indicator-item"
                          key={`${indicator.name}-${indicatorIndex}`}
                        >
                          <span className="mobile-indicator-name">{indicator.name}</span>
                          <span className="mobile-indicator-score">
                            {typeof indicator.score === "number" ? indicator.score : "N/A"}
                          </span>
                        </div>
                      ))}
                    </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className={`network-legend ${isMobileLayout ? "mobile-network-footer" : ""}`}>
              <p className="network-legend-title">Active Networks</p>
              <p className="network-legend-subtitle">
                {activeLoading
                  ? `Loading network data for ${selectedLabel}...`
                  : activeLinksCount > 0
                    ? `${activeLinksCount} links with data for ${selectedLabel}`
                    : `No network data for ${selectedLabel}`}
              </p>
              <p className="network-legend-source">Data Source: {dataSourceName}</p>
            </div>
            {activeLoading && (
              <div className="network-loading-indicator">
                <span className="network-loading-spinner" />
                <span>Refreshing indicators...</span>
              </div>
            )}
          </>
        )}
      </div>

      <div id="node-networks-map" className={className}>
        {children}
      </div>
    </div>
  );
};

export default NodeNetworks;
