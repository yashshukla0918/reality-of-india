import type { DistrictFeature, StateFeature } from "../types/geo";

let allStatesData: StateFeature[] = [];
let districtsByState: Record<string, DistrictFeature[]> = {};
let allDistrictsData: DistrictFeature[] = [];
let indiaGeoJSON: any = null;
let statesLoadPromise: Promise<StateFeature[]> | null = null;
let districtsLoadPromise: Promise<Record<string, DistrictFeature[]>> | null =
  null;
let boundaryLoadPromise: Promise<any> | null = null;

async function fetchWithErrorHandling(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch data from ${url}`);
    }
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    throw new Error(`Failed to load data: ${message}`);
  }
}

export async function loadStates() {
  if (allStatesData.length) return allStatesData;
  if (statesLoadPromise) return statesLoadPromise;

  statesLoadPromise = (async () => {
    const data = await fetchWithErrorHandling(
      "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson"
    );

    if (!data.features || !Array.isArray(data.features)) {
      throw new Error("Invalid states data format");
    }

    allStatesData = data.features;
    return allStatesData;
  })().catch((error) => {
    statesLoadPromise = null;
    throw error;
  });

  return statesLoadPromise;
}

export async function loadIndiaBoundary() {
  if (indiaGeoJSON) return indiaGeoJSON;
  if (boundaryLoadPromise) return boundaryLoadPromise;

  boundaryLoadPromise = (async () => {
    const data = await fetchWithErrorHandling(
      "https://raw.githubusercontent.com/yashshukla0918/datasets/main/countries/India/maps/india_state.geojson"
    );

    if (!data.features) {
      throw new Error("Invalid boundary data format");
    }

    indiaGeoJSON = data;
    return indiaGeoJSON;
  })().catch((error) => {
    boundaryLoadPromise = null;
    throw error;
  });

  return boundaryLoadPromise;
}

export async function loadDistricts() {
  if (Object.keys(districtsByState).length) return districtsByState;
  if (districtsLoadPromise) return districtsLoadPromise;

  districtsLoadPromise = (async () => {
    const data = await fetchWithErrorHandling(
      "https://projects.datameet.org/maps/data/geojson/dists11.geojson"
    );

    if (!data.features || !Array.isArray(data.features)) {
      throw new Error("Invalid districts data format");
    }

    allDistrictsData = data.features;

    const groupedByState: Record<string, DistrictFeature[]> = {};
    const seenDistricts = new Set<string>();

    data.features.forEach((f: DistrictFeature) => {
      const state = f.properties.ST_NM;
      const district = f.properties.DISTRICT;
      const districtKey = `${state}::${district}`;

      // Protect search/list consumers from duplicate district features in source data.
      if (seenDistricts.has(districtKey)) return;
      seenDistricts.add(districtKey);

      if (!groupedByState[state]) {
        groupedByState[state] = [];
      }

      groupedByState[state].push(f);
    });

    districtsByState = groupedByState;
    return districtsByState;
  })().catch((error) => {
    districtsLoadPromise = null;
    throw error;
  });

  return districtsLoadPromise;
}

export function getDistrictsByState(state: string) {
  return districtsByState[state] || [];
}

export function getStateByName(stateName: string) {
  return allStatesData.find(
    (f) => (f.properties.NAME_1 || f.properties.st_nm) === stateName
  );
}

export function getDistrictByName(districtName: string, stateName: string) {
  return allDistrictsData.find(
    (f) =>
      f.properties.DISTRICT === districtName && f.properties.ST_NM === stateName
  );
}
