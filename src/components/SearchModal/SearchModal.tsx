import { useState, useEffect, useRef } from "react";
import { useSearchData, type SearchItem } from "../../hooks/useSearchData";
import "./SearchModal.css";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStateSelect: (stateName: string) => void;
  onDistrictSelect: (districtName: string, stateName: string) => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  onStateSelect,
  onDistrictSelect,
}: SearchModalProps) {
  const [searchValue, setSearchValue] = useState<string>("");
  const [showResults, setShowResults] = useState<boolean>(false);
  const { filteredItems } = useSearchData(searchValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSelectItem = (item: SearchItem) => {
    if (item.type === "state") {
      onStateSelect(item.name);
    } else {
      onDistrictSelect(item.districtName!, item.stateName!);
    }
    setSearchValue("");
    setShowResults(false);
    onClose();
  };

  const handleSearch = () => {
    if (searchValue.trim() && filteredItems.length > 0) {
      handleSelectItem(filteredItems[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop" onClick={handleBackdropClick}>
      <div className="search-modal" ref={modalRef}>
        <div className="search-modal-content">
          <div className="search-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search state or district..."
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setShowResults(true);
              }}
              onKeyDown={handleKeyDown}
              className="search-modal-input"
            />
            <button
              className="search-modal-button"
              onClick={handleSearch}
              disabled={!searchValue.trim()}
            >
              Search
            </button>
          </div>

          {showResults && searchValue.trim() && (
            <div className="search-results">
              {filteredItems.length > 0 ? (
                <ul className="search-results-list">
                  {filteredItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="search-result-item"
                      onClick={() => handleSelectItem(item)}
                    >
                      <span className="result-name">{item.name}</span>
                      {item.type === "district" && (
                        <span className="result-state">
                          {item.stateName}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="search-no-results">No results found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
