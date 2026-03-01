const WORLD_BANK = "https://api.worldbank.org/v2";
const OPENAQ = "https://api.openaq.org/v2";
const OPEN_METEO_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";
const OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_AIR_QUALITY = "https://air-quality-api.open-meteo.com/v1/air-quality";
const REQUEST_TIMEOUT_MS = 10000;

export type WorldBankEntry = {
  value: number | null;
};

export type WorldBankResponse = [unknown, WorldBankEntry[]];

type OpenAQMeasurement = {
  value?: number;
};

type OpenAQResult = {
  measurements?: OpenAQMeasurement[];
};

export type OpenAQResponse = {
  results?: OpenAQResult[];
};

type OpenMeteoGeocodeResult = {
  latitude: number;
  longitude: number;
};

export type OpenMeteoGeocodeResponse = {
  results?: OpenMeteoGeocodeResult[];
};

export type OpenMeteoCurrentWeatherResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
  };
};

export type OpenMeteoAirQualityResponse = {
  hourly?: {
    us_aqi?: number[];
  };
};

async function fetchJSON<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to fetch ${url}: ${message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchGDP() {
  return fetchWorldBankIndicator("NY.GDP.PCAP.PP.CD");
}

export async function fetchUnemployment() {
  return fetchWorldBankIndicator("SL.UEM.TOTL.ZS");
}

export async function fetchLifeExpectancy() {
  return fetchWorldBankIndicator("SP.DYN.LE00.IN");
}

export async function fetchGini() {
  return fetchWorldBankIndicator("SI.POV.GINI");
}

export async function fetchAirQuality(city: string) {
  return fetchJSON<OpenAQResponse>(
    `${OPENAQ}/latest?country=IN&city=${encodeURIComponent(city)}`
  );
}

export async function fetchInfantMortality() {
  return fetchWorldBankIndicator("SP.DYN.IMRT.IN");
}

export async function fetchLiteracyRate() {
  return fetchWorldBankIndicator("SE.ADT.LITR.ZS");
}

export async function fetchWorldBankIndicator(indicator: string) {
  return fetchJSON<WorldBankResponse>(
    `${WORLD_BANK}/country/IND/indicator/${encodeURIComponent(indicator)}?format=json`
  );
}

export async function fetchGeocodeForLocation(query: string) {
  return fetchJSON<OpenMeteoGeocodeResponse>(
    `${OPEN_METEO_GEOCODING}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
  );
}

export async function fetchCurrentWeather(lat: number, lon: number) {
  return fetchJSON<OpenMeteoCurrentWeatherResponse>(
    `${OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&forecast_days=1`
  );
}

export async function fetchAirQualityByCoordinates(lat: number, lon: number) {
  return fetchJSON<OpenMeteoAirQualityResponse>(
    `${OPEN_METEO_AIR_QUALITY}?latitude=${lat}&longitude=${lon}&hourly=us_aqi&forecast_days=1`
  );
}
