import "./LoadingSpinner.css";

export default function LoadingSpinner() {
  return (
    <div className="loading-spinner-overlay">
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <p className="spinner-text">Loading map data...</p>
      </div>
    </div>
  );
}
