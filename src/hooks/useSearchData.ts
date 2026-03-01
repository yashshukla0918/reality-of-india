import { useState, useEffect } from "react";
import { loadStates, loadDistricts } from "../services/dataService";
import { useDataLoading } from "../components/DataLoadingProvider/DataLoadingContext";
import { useDebounce } from "./useDebounce";

export interface SearchItem {
  name: string;
  type: "state" | "district";
  stateName?: string;
  districtName?: string;
}

export function useSearchData(searchValue: string) {
  const [items, setItems] = useState<SearchItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SearchItem[]>([]);
  const debouncedSearchValue = useDebounce(searchValue, 100);
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
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load search data";
        setError(errorMsg);
        console.error("Error loading search data:", err);
      }
    };

    loadData();
  }, [setError]);

  // Filter items when debounced search value changes
  useEffect(() => {
    if (!debouncedSearchValue) {
      setFilteredItems(items);
      return;
    }

    const filter = debouncedSearchValue.toLowerCase();
    setFilteredItems(
      items.filter((item) => item.name.toLowerCase().includes(filter))
    );
  }, [debouncedSearchValue, items]);

  return { filteredItems, debouncedSearchValue };
}
