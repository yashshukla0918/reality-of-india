import type { DistrictFeature, StateFeature } from "../types/geo";

let allStatesData: StateFeature[] = [];
let districtsByState: Record<string, DistrictFeature[]> = {};
let allDistrictsData: DistrictFeature[] = [];
let indiaGeoJSON: any = null;

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

  const data = await fetchWithErrorHandling(
    "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson"
  );
  
  if (!data.features || !Array.isArray(data.features)) {
    throw new Error("Invalid states data format");
  }
  
  allStatesData = data.features;
  return allStatesData;
}

export async function loadIndiaBoundary() {
  if (indiaGeoJSON) return indiaGeoJSON;

  const data = await fetchWithErrorHandling(
    "https://raw.githubusercontent.com/yashshukla0918/datasets/main/countries/India/maps/india_state.geojson"
  );
  
  if (!data.features) {
    throw new Error("Invalid boundary data format");
  }
  
  indiaGeoJSON = data;
  return indiaGeoJSON;
}

export async function loadDistricts() {
  if (Object.keys(districtsByState).length) return districtsByState;

  const data = await fetchWithErrorHandling(
    "https://projects.datameet.org/maps/data/geojson/dists11.geojson"
  );

  if (!data.features || !Array.isArray(data.features)) {
    throw new Error("Invalid districts data format");
  }

  allDistrictsData = data.features;

  data.features.forEach((f: DistrictFeature) => {
    const state = f.properties.ST_NM;

    if (!districtsByState[state]) {
      districtsByState[state] = [];
    }

    districtsByState[state].push(f);
  });

  return districtsByState;
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