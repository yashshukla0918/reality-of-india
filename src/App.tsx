import { useEffect, useState } from "react";
import MapView from "./components/MapView";
import SidePanel from "./components/SidePanel";
import CanvasMiniMap from "./components/CanvasMiniMap/CanvasMiniMap";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner/LoadingSpinner";
import SearchModal from "./components/SearchModal/SearchModal";
import { CiSearch } from "react-icons/ci";
import { FaToggleOn, FaToggleOff } from "react-icons/fa";
import {
  DataLoadingProvider,
  useDataLoading,
} from "./components/DataLoadingProvider/DataLoadingContext";
import { useSelectionState } from "./hooks/useSelectionState";
import { usePanelState } from "./hooks/usePanelState";
import "./App.css";
import { APP_NAME } from "../app.config";
import NodeNetworks from "./components/NodeNetworks/NodeNetworks";

function AppContent() {
  const { selectionState, handleStateSelect, handleDistrictSelect, handleReset } =
    useSelectionState();
  const { panelOpen, togglePanel, closePanel } = usePanelState();
  const { isLoading, error, isDarkMode, setIsDarkMode } = useDataLoading();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  
  useEffect(() => {
    const handleGlobalSearchShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };

    document.addEventListener("keydown", handleGlobalSearchShortcut);
    return () =>
      document.removeEventListener("keydown", handleGlobalSearchShortcut);
  }, []);

  return (
    <>
      {isLoading && <LoadingSpinner />}
      {error && (
        <div className="error-message-bar">
          <span>⚠️ {error}</span>
          <button
            className="error-close-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}
      <header>
        <span className="app-title">{APP_NAME.label}</span>
        <div className="header-actions">
          <button 
            className="icon-btn" 
            type="button"
            onClick={() => setSearchModalOpen(true)}
            title="Search"
            aria-label="Open search"
          >
            <CiSearch />
          </button>
          <button 
            className="panel-toggle-btn" 
            type="button"
            onClick={togglePanel}
            title={panelOpen ? "Close panel" : "Open panel"}
            aria-label={panelOpen ? "Close side panel" : "Open side panel"}
          >
            {panelOpen ? "✕" : "≡"}
          </button>
          <button
            className="icon-btn theme-toggle-btn"
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Switch to light map" : "Switch to dark map"}
            aria-label={isDarkMode ? "Switch to light map" : "Switch to dark map"}
          >
            {isDarkMode ? <FaToggleOn size={28} /> : <FaToggleOff size={28} />}
          </button>
        </div>
      </header>
      <NodeNetworks selectionState={selectionState} className="main-container">
        <MapView
          isDarkMode={isDarkMode}
          selectionState={selectionState}
          onStateSelect={handleStateSelect}
          onDistrictSelect={handleDistrictSelect}
        />
        <CanvasMiniMap
          selectedState={selectionState.selectedState}
          selectedDistrict={selectionState.selectedDistrict}
        />
      </NodeNetworks>
      <SidePanel
        isOpen={panelOpen}
        selectionState={selectionState}
        onReset={handleReset}
        onStateSelect={handleStateSelect}
        onDistrictSelect={handleDistrictSelect}
        onClose={closePanel}
      />
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onStateSelect={handleStateSelect}
        onDistrictSelect={handleDistrictSelect}
      />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DataLoadingProvider>
        <AppContent />
      </DataLoadingProvider>
    </ErrorBoundary>
  );
}
