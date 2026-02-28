import { useState, useEffect, useRef } from "react";
import { loadStates, loadDistricts } from "../../services/dataService";
import { useDataLoading } from "../DataLoadingProvider/DataLoadingContext";
import { useDebounce } from "../../hooks/useDebounce";
import type { SelectionState } from "../../types/geo";

interface SearchItem {
  name: string;
  type: "state" | "district";
  stateName?: string;
  districtName?: string;
}

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
  const debouncedSearchValue = useDebounce(searchValue, 100);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SearchItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setError } = useDataLoading();

  // Load search items
  useEffect(() => {
    const loadData = async () => {
      try {
        const states = await loadStates();
        const districts = await loadDistricts();

        const stateItems: SearchItem[] = states.map((f: any) => ({
          name: f.properties.NAME_1 || f.properties.st_nm,
          type: "state" as const,
        }));

        const districtItems: SearchItem[] = [];
        Object.entries(districts).forEach(([stateName, districtList]: any) => {
          districtList.forEach((district: any) => {
            districtItems.push({
              name: `${district.properties.DISTRICT} (${stateName})`,
              type: "district" as const,
              stateName,
              districtName: district.properties.DISTRICT,
            });
          });
        });

        const allItems = [...stateItems, ...districtItems];
        setItems(allItems);
        setFilteredItems(allItems);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to load search data";
        setError(errorMsg);
        console.error("Error loading search data:", err);
      }
    };

    loadData();
  }, [setError]);

  // Filter items when debounced search value changes
  useEffect(() => {
    const filter = debouncedSearchValue.toLowerCase();
    setFilteredItems(
      items.filter((item) => item.name.toLowerCase().includes(filter))
    );
  }, [debouncedSearchValue, items]);

  // Handle search input
  const handleSearch = (value: string) => {
    setSearchValue(value);
    const filter = value.toLowerCase();
    setFilteredItems(
      items.filter((item) => item.name.toLowerCase().includes(filter))
    );
  };

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
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setDropdownOpen(true)}
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
