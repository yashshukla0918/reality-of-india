import {
  fetchAirQuality,
  fetchAirQualityByCoordinates,
  fetchCurrentWeather,
  fetchGDP,
  fetchGeocodeForLocation,
  fetchGini,
  fetchInfantMortality,
  fetchLifeExpectancy,
  fetchLiteracyRate,
  fetchUnemployment,
  type OpenAQResponse,
  type WorldBankResponse,
} from "./fetch";

export type EvaluationSignalKey =
  | "gdp"
  | "unemployment"
  | "gini"
  | "lifeExpectancy"
  | "aqi"
  | "infantMortality"
  | "literacyRate"
  | "temperature"
  | "humidity"
  | "windSpeed";

export type EvaluationSignalValue = number | null;

export type EvaluationProviderContext = {
  state: string;
  district?: string;
};

export type EvaluationProvider = {
  key: EvaluationSignalKey;
  label: string;
  sourceName: string;
  fetch: (context: EvaluationProviderContext) => Promise<EvaluationSignalValue>;
};

function latestWorldBankValue(worldBankResponse: WorldBankResponse) {
  const rows = worldBankResponse?.[1];
  if (!Array.isArray(rows)) return null;
  const latestRow = rows.find((row) => row.value !== null);
  return latestRow?.value ?? null;
}

function latestAqi(openAqResponse: OpenAQResponse) {
  const value = openAqResponse?.results?.[0]?.measurements?.[0]?.value;
  return typeof value === "number" ? value : null;
}

type LocationPoint = { lat: number; lon: number };
const locationCache = new Map<string, Promise<LocationPoint | null>>();

async function resolveLocationPoint({
  state,
  district,
}: EvaluationProviderContext): Promise<LocationPoint | null> {
  const normalizedDistrict = (district ?? "").trim().toLowerCase();
  const key = `${state}::${normalizedDistrict || "_state_"}`;
  const existing = locationCache.get(key);
  if (existing) return existing;

  const request = (async () => {
    const queries = district
      ? [
          `${district}, ${state}, India`,
          `${district}, India`,
          `${state}, India`,
          "India",
        ]
      : [`${state}, India`, "India"];

    for (const query of queries) {
      const response = await fetchGeocodeForLocation(query);
      const point = response.results?.[0];
      if (point) {
        return { lat: point.latitude, lon: point.longitude };
      }
    }

    return null;
  })();

  locationCache.set(key, request);
  return request;
}

async function fetchAqiSignal(context: EvaluationProviderContext) {
  if (context.district) {
    const cityAqi = await fetchAirQuality(context.district)
      .then((response) => latestAqi(response))
      .catch(() => null);
    if (cityAqi !== null) return cityAqi;
  }

  const point = await resolveLocationPoint(context);
  if (!point) return null;

  const air = await fetchAirQualityByCoordinates(point.lat, point.lon);
  const aqi = air.hourly?.us_aqi?.[0];
  return typeof aqi === "number" ? aqi : null;
}

async function fetchCurrentWeatherSignal(
  context: EvaluationProviderContext,
  key: "temperature_2m" | "relative_humidity_2m" | "wind_speed_10m"
) {
  const point = await resolveLocationPoint(context);
  if (!point) return null;

  const response = await fetchCurrentWeather(point.lat, point.lon);
  const value = response.current?.[key];
  return typeof value === "number" ? value : null;
}

export const evaluationProviders: EvaluationProvider[] = [
  // Add new API integrations by appending provider entries here.
  {
    key: "gdp",
    label: "GDP per capita (PPP)",
    sourceName: "World Bank",
    fetch: async () => latestWorldBankValue(await fetchGDP()),
  },
  {
    key: "unemployment",
    label: "Unemployment rate",
    sourceName: "World Bank",
    fetch: async () => latestWorldBankValue(await fetchUnemployment()),
  },
  {
    key: "gini",
    label: "Gini index",
    sourceName: "World Bank",
    fetch: async () => latestWorldBankValue(await fetchGini()),
  },
  {
    key: "lifeExpectancy",
    label: "Life expectancy",
    sourceName: "World Bank",
    fetch: async () => latestWorldBankValue(await fetchLifeExpectancy()),
  },
  {
    key: "infantMortality",
    label: "Infant mortality",
    sourceName: "World Bank",
    fetch: async () => latestWorldBankValue(await fetchInfantMortality()),
  },
  {
    key: "literacyRate",
    label: "Literacy rate",
    sourceName: "World Bank",
    fetch: async () => latestWorldBankValue(await fetchLiteracyRate()),
  },
  {
    key: "aqi",
    label: "Air quality index",
    sourceName: "OpenAQ/Open-Meteo",
    fetch: fetchAqiSignal,
  },
  {
    key: "temperature",
    label: "Temperature",
    sourceName: "Open-Meteo",
    fetch: async (context) =>
      fetchCurrentWeatherSignal(context, "temperature_2m"),
  },
  {
    key: "humidity",
    label: "Relative humidity",
    sourceName: "Open-Meteo",
    fetch: async (context) =>
      fetchCurrentWeatherSignal(context, "relative_humidity_2m"),
  },
  {
    key: "windSpeed",
    label: "Wind speed",
    sourceName: "Open-Meteo",
    fetch: async (context) =>
      fetchCurrentWeatherSignal(context, "wind_speed_10m"),
  },
];
