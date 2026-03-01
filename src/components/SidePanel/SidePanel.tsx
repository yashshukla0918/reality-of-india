import { useState, useEffect, useRef } from "react";
import { useSearchData, type SearchItem } from "../../hooks/useSearchData";
import type { SelectionState } from "../../types/geo";

interface SidePanelProps {
  isOpen: boolean;
  selectionState: SelectionState;
  onReset: () => void;
  onStateSelect: (stateName: string) => void;
  onDistrictSelect: (districtName: string, stateName: string) => void;
  onClose?: () => void;
}

export default function SidePanel({
  isOpen,
  selectionState,
  onReset,
  onStateSelect,
  onDistrictSelect,
  onClose,
}: SidePanelProps) {
  const [searchValue, setSearchValue] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const { filteredItems } = useSearchData(searchValue);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle item selection
  const handleSelectItem = (item: SearchItem) => {
    if (item.type === "state") {
      onStateSelect(item.name);
    } else {
      onDistrictSelect(item.districtName!, item.stateName!);
    }
    setSearchValue("");
    setDropdownOpen(false);
  };

  // Handle reset
  const handleReset = () => {
    onReset();
    setSearchValue("");
    setDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayText =
    selectionState.selectedDistrict && selectionState.selectedStateName
      ? `${selectionState.selectedDistrict} (${selectionState.selectedStateName})`
      : selectionState.selectedState || "None";

  return (
    <>
      {isOpen && (
        <div 
          className="side-panel-backdrop"
          onClick={onClose}
          role="presentation"
        />
      )}
      <div className={`side-panel ${isOpen ? "open" : "closed"}`}>
        <div className="state-display">
          <strong>Selected:</strong> <span className="selected-name">{displayText}</span>
        </div>

        <div className="dropdown" ref={dropdownRef}>
          <input
            type="text"
            placeholder="Search state or district..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDropdownOpen(false);
              }
            }}
            className="search-input"
          />
          {dropdownOpen && filteredItems.length > 0 && (
            <div className="dropdown-list">
              {filteredItems.map((item, idx) => (
                <div
                  key={idx}
                  className="dropdown-item"
                  onClick={() => handleSelectItem(item)}
                >
                  {item.name}
                </div>
              ))}
            </div>
          )}
          {dropdownOpen && filteredItems.length === 0 && searchValue && (
            <div className="dropdown-list">
              <div className="dropdown-item">No results found</div>
            </div>
          )}
        </div>

        <button className="reset-btn" onClick={handleReset}>
          Reset
        </button>
      </div>
    </>
  );
}
