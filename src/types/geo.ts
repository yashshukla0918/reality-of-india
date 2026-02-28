export interface StateFeature {
  type: "Feature";
  properties: {
    NAME_1?: string;
    st_nm?: string;
  };
  geometry: any;
}

export interface DistrictFeature {
  type: "Feature";
  properties: {
    ST_NM: string;
    DISTRICT: string;
  };
  geometry: any;
}

export interface SelectionState {
  selectedState: string | null;
  selectedDistrict: string | null;
  selectedStateName: string | null;
}