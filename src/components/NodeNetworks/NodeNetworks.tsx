import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SelectionState } from "../../types/geo";
import {
  useDistrictEvaluation,
  useStateEvaluation,
} from "../../services/evaluation/services";
import {
  networksDataByStateAndDistrict,
  normalizeKey,
  type NetworkInfo,
} from "./networkData";
import {
  useNodeNetworkLayout,
  type DragOffset,
} from "./useNodeNetworkLayout";
import "./NodeNetworks.css";

type NodeNetworksProps = {
  children?: React.ReactNode;
  className: string;
  selectionState: SelectionState;
};

type NetworkCard = NetworkInfo & {
  key: string;
  indicatorsWithData: number;
  hasData: boolean;
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
  const [isMobileDockVisible, setIsMobileDockVisible] = useState(true);
  const [dragOffsets, setDragOffsets] = useState<Record<string, DragOffset>>({});
  const [draggingNodeKey, setDraggingNodeKey] = useState<string | null>(null);
  const dragConsumedClickRef = useRef(false);
  const dragOffsetsRef = useRef<Record<string, DragOffset>>({});
  const dragSessionRef = useRef<{
    key: string;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    hasExceededThreshold: boolean;
  } | null>(null);

  const isDistrictMode = Boolean(selectionState.selectedDistrict);
  const accentColor = isDistrictMode ? "#22c55e" : "#fbbf24";
  const accentRgb = isDistrictMode ? "34, 197, 94" : "251, 191, 36";

  const selectedState = selectionState.selectedState ?? "";
  const selectedDistrict = selectionState.selectedDistrict ?? "";

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

  useEffect(() => {
    dragOffsetsRef.current = dragOffsets;
  }, [dragOffsets]);

  const handleGlobalPointerMove = useCallback((event: PointerEvent) => {
    const session = dragSessionRef.current;
    if (!session) return;

    const deltaX = event.clientX - session.startX;
    const deltaY = event.clientY - session.startY;

    if (!session.hasExceededThreshold) {
      const dragDistance = Math.hypot(deltaX, deltaY);
      if (dragDistance < 4) {
        return;
      }
      session.hasExceededThreshold = true;
      dragConsumedClickRef.current = true;
      setDraggingNodeKey(session.key);
    }

    const nextOffset = { x: session.baseX + deltaX, y: session.baseY + deltaY };

    setDragOffsets((prev) => ({ ...prev, [session.key]: nextOffset }));
  }, []);

  const handleGlobalPointerUp = useCallback(() => {
    const didDrag = Boolean(dragSessionRef.current?.hasExceededThreshold);
    stopDragging();
    if (didDrag) {
      window.setTimeout(() => {
        dragConsumedClickRef.current = false;
      }, 0);
    }
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

      const existingOffset = dragOffsetsRef.current[key] ?? { x: 0, y: 0 };
      dragSessionRef.current = {
        key,
        startX: event.clientX,
        startY: event.clientY,
        baseX: existingOffset.x,
        baseY: existingOffset.y,
        hasExceededThreshold: false,
      };
    },
    []
  );

  const networkCards = useMemo<NetworkCard[]>(
    () =>
      networksData.map((network, index) => {
        const indicatorsWithData = network.indicators.filter(
          (indicator) => typeof indicator.score === "number"
        ).length;
        return {
          ...network,
          key: `${normalizeKey(network.name)}-${index}`,
          indicatorsWithData,
          hasData: indicatorsWithData > 0,
        };
      }),
    [networksData]
  );

  const { positionedNetworks, subnodeLayout } = useNodeNetworkLayout({
    networkCards,
    dragOffsets,
    isDistrictMode,
    viewportSize,
  });

  const isMobileLayout = viewportSize.width <= 767;

  useEffect(() => {
    const validBaseKeys = new Set(networkCards.map((network) => network.key));
    setDragOffsets((previous) => {
      let hasChanges = false;
      const nextOffsets: Record<string, DragOffset> = {};

      Object.entries(previous).forEach(([offsetKey, offsetValue]) => {
        const isBaseKey = validBaseKeys.has(offsetKey);
        const subSeparatorIndex = offsetKey.indexOf("-sub-");
        const isSubKey =
          subSeparatorIndex !== -1 &&
          validBaseKeys.has(offsetKey.slice(0, subSeparatorIndex));

        if (isBaseKey || isSubKey) {
          nextOffsets[offsetKey] = offsetValue;
        } else {
          hasChanges = true;
        }
      });

      return hasChanges ? nextOffsets : previous;
    });
  }, [networkCards]);

  useEffect(() => {
    if (!expandedParentKey) return;
    if (!networkCards.some((network) => network.key === expandedParentKey)) {
      setExpandedParentKey(null);
    }
  }, [expandedParentKey, networkCards]);

  useEffect(() => {
    if (!isMobileLayout) return;

    if (!expandedParentKey && networkCards.length > 0) {
      setExpandedParentKey(networkCards[0].key);
      return;
    }
  }, [expandedParentKey, networkCards, isMobileLayout]);

  useEffect(() => {
    if (!isMobileLayout) return;
    setIsMobileIndicatorOpen(true);
  }, [expandedParentKey, isMobileLayout]);

  useEffect(() => {
    if (isMobileLayout) {
      setIsMobileDockVisible(true);
    }
  }, [isMobileLayout]);

  const selectedMobileNetwork = useMemo(
    () => networkCards.find((network) => network.key === expandedParentKey) ?? null,
    [expandedParentKey, networkCards]
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
    () => networkCards.filter((network) => network.hasData).length,
    [networkCards]
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
                    zIndex: isExpanded ? 16 : isSecondary ? 14 : 15,
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
                          onPointerDown={(event) => {
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (dragConsumedClickRef.current) {
                              dragConsumedClickRef.current = false;
                              return;
                            }
                            setExpandedParentKey((current) =>
                              current === network.key ? null : network.key
                            );
                          }}
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
                                  zIndex: 10,
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
              <>
                {isMobileDockVisible && (
                  <div className="mobile-network-dock">
                    <div className="mobile-network-dock-legend">
                      <div className="mobile-network-dock-header">
                        <p className="network-legend-title">Active Networks</p>
                        <button
                          type="button"
                          className="mobile-network-dock-toggle-btn"
                          onClick={() => setIsMobileDockVisible(false)}
                          aria-label="Close dock"
                        >
                          Close
                        </button>
                      </div>
                      <p className="network-legend-subtitle">
                        {activeLoading
                          ? `Loading network data for ${selectedLabel}...`
                          : activeLinksCount > 0
                            ? `${activeLinksCount} links with data for ${selectedLabel}`
                            : `No network data for ${selectedLabel}`}
                      </p>
                      <p className="network-legend-source">Data Source: {dataSourceName}</p>
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
                <div className="mobile-network-footer">
                  <p className="mobile-network-summary">
                    {activeLoading
                      ? "Refreshing network indicators..."
                      : activeLinksCount > 0
                        ? `${activeLinksCount} categories with data for ${selectedLabel}`
                        : `No network data for ${selectedLabel}`}
                  </p>
                  {!isMobileDockVisible && (
                    <button
                      type="button"
                      className="mobile-network-footer-open-btn"
                      onClick={() => setIsMobileDockVisible(true)}
                    >
                      Open details
                    </button>
                  )}
                  <div className="mobile-network-scroll">
                    {networkCards.sort((a,b) => {
                      const aScore = a.nodes ?? Number.NEGATIVE_INFINITY;
                      const bScore = b.nodes ?? Number.NEGATIVE_INFINITY;
                      if (aScore === bScore) return a.name.localeCompare(b.name);
                      return bScore - aScore;
                    }).map((network) => {
                      const isActive = selectedMobileNetwork?.key === network.key;
                      return (
                        <button
                          key={network.key}
                          type="button"
                          className={`mobile-network-card ${isActive ? "active" : ""}`}
                          onClick={() => {
                            setExpandedParentKey(network.key);
                            setIsMobileDockVisible(true);
                          }}
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
                </div>
              </>
            )}

            {!isMobileLayout && (
              <div className="network-legend">
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
            )}
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
