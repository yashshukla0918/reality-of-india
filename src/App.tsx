import { useState } from "react";
import MapView from "./components/MapView";
import SidePanel from "./components/SidePanel";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner/LoadingSpinner";
import {
  DataLoadingProvider,
  useDataLoading,
} from "./components/DataLoadingProvider/DataLoadingContext";
import type { SelectionState } from "./types/geo";
import "./App.css";
import { APP_NAME } from "../app.config";

function AppContent() {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedState: null,
    selectedDistrict: null,
    selectedStateName: null,
  });
  const [panelOpen, setPanelOpen] = useState<boolean>(true);
  const { isLoading, error } = useDataLoading();

  const handleStateSelect = (stateName: string) => {
    setSelectionState({
      selectedState: stateName,
      selectedDistrict: null,
      selectedStateName: stateName,
    });
  };

  const handleDistrictSelect = (districtName: string, stateName: string) => {
    setSelectionState((prev) => ({
      ...prev,
      selectedDistrict: districtName,
      selectedStateName: stateName,
    }));
  };

  const handleReset = () => {
    setSelectionState({
      selectedState: null,
      selectedDistrict: null,
      selectedStateName: null,
    });
  };

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
      <header>{APP_NAME.label}
        <button 
          className="panel-toggle-btn" 
          onClick={() => setPanelOpen(!panelOpen)}
          title={panelOpen ? "Close panel" : "Open panel"}
        >
          {panelOpen ? "✕" : "≡"}
        </button>
      </header>
      <MapView
        selectionState={selectionState}
        onStateSelect={handleStateSelect}
        onDistrictSelect={handleDistrictSelect}
      />
      <SidePanel
        isOpen={panelOpen}
        selectionState={selectionState}
        onReset={handleReset}
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