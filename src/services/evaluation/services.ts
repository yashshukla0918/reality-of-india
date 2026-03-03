import {
  evaluationProviders,
  type EvaluationSignalKey,
  type EvaluationSignalValue,
} from "./providers";
import { buildEvaluationData } from "./fabricate";
import { useEffect, useState } from "react";
import type {
  DistrictEvaluation,
  DistrictEvaluationResponse,
  EvaluationError,
} from "../../types/evaluation";

type EvaluationCacheEntry = {
  data: DistrictEvaluation;
  sources: string[];
  timestamp: number;
};

const cache = new Map<string, EvaluationCacheEntry>();
const inflight = new Map<string, Promise<DistrictEvaluationResponse>>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

function normalizeLocation(value: string) {
  return value.trim().toLowerCase();
}

function setCache(key: string, data: DistrictEvaluation, sources: string[]) {
  cache.set(key, { data, sources, timestamp: Date.now() });
}

function getCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function toFailureMessage(label: string, reason: unknown) {
  const reasonMessage =
    reason instanceof Error ? reason.message : "Unknown fetch error";
  return `${label}: ${reasonMessage}`;
}

function toEvaluationError(messages: string[]): EvaluationError | null {
  if (messages.length === 0) return null;
  return {
    message: "Some data sources failed. Returned best effort evaluation.",
    causes: messages,
  };
}

function cacheKeyFor(state: string, district: string) {
  return `${normalizeLocation(state)}::${normalizeLocation(district)}`;
}

function stateCacheKeyFor(state: string) {
  return `${normalizeLocation(state)}::__state__`;
}

function hasAtLeastOneIndicatorScore(data: DistrictEvaluation) {
  return data.evaluation.some((category) =>
    category.indicators.some((indicator) => indicator.score !== null)
  );
}

function hasLocationSpecificSignals(
  signals: Partial<Record<EvaluationSignalKey, EvaluationSignalValue>>
) {
  const locationKeys: EvaluationSignalKey[] = [
    "aqi",
    "temperature",
    "humidity",
    "windSpeed",
  ];

  return locationKeys.some((key) => signals[key] !== null && signals[key] !== undefined);
}

async function evaluateForLocation(
  state: string,
  district?: string
): Promise<DistrictEvaluationResponse> {
  const canonicalState = state.trim();
  const canonicalDistrict = (district ?? "").trim();
  const normalizedState = normalizeLocation(state);
  const normalizedDistrict = normalizeLocation(district ?? "");

  if (!normalizedState) {
    throw new Error("State is required.");
  }

  const cacheKey = district
    ? cacheKeyFor(normalizedState, normalizedDistrict)
    : stateCacheKeyFor(normalizedState);
  const cached = getCache(cacheKey);
  if (cached) {
    return {
      data: cached.data,
      error: null,
      stale: false,
      sources: cached.sources,
    };
  }

  const existingRequest = inflight.get(cacheKey);
  if (existingRequest) return existingRequest;

  const requestPromise = (async () => {
    const providerResults = await Promise.allSettled(
      evaluationProviders.map((provider) =>
        provider.fetch({
          state: canonicalState,
          district: canonicalDistrict || undefined,
        })
      )
    );

    const failures: string[] = [];
    const sources = new Set<string>();
    const signals: Partial<Record<EvaluationSignalKey, EvaluationSignalValue>> =
      {};

    providerResults.forEach((result, index) => {
      const provider = evaluationProviders[index];
      if (result.status === "rejected") {
        failures.push(toFailureMessage(provider.label, result.reason));
        return;
      }

      signals[provider.key] = result.value;
      if (result.value !== null && result.value !== undefined) {
        sources.add(provider.sourceName);
      }
    });

    const result = buildEvaluationData({
      state: canonicalState,
      district: canonicalDistrict || canonicalState,
      signals,
    });

    if (!hasAtLeastOneIndicatorScore(result) && failures.length === 0) {
      failures.push("No indicators could be derived from upstream sources.");
    }
    if (!hasLocationSpecificSignals(signals)) {
      failures.push(
        "Location-specific signals unavailable (AQI/weather). Results may reflect national defaults."
      );
    }

    const error = toEvaluationError(failures);
    const stale = failures.length > 0;

    const sourceList = Array.from(sources);
    setCache(cacheKey, result, sourceList);
    return { data: result, error, stale, sources: sourceList };
  })().finally(() => {
    inflight.delete(cacheKey);
  });

  inflight.set(cacheKey, requestPromise);
  return requestPromise;
}

export async function getDistrictEvaluation(
  state: string,
  district: string
): Promise<DistrictEvaluationResponse> {
  if (!state || !district) {
    throw new Error("State and district are required.");
  }
  return evaluateForLocation(state, district);
}

export async function getStateEvaluation(
  state: string
): Promise<DistrictEvaluationResponse> {
  return evaluateForLocation(state);
}

export async function getDistrictEvaluationData(
  state: string,
  district: string
): Promise<DistrictEvaluation> {
  const response = await getDistrictEvaluation(state, district);
  return response.data;
}

export async function getStateEvaluationData(
  state: string
): Promise<DistrictEvaluation> {
  const response = await getStateEvaluation(state);
  return response.data;
}

export function clearEvaluationCache() {
  cache.clear();
  inflight.clear();
}

export function primeEvaluationCache(data: DistrictEvaluation) {
  const key = cacheKeyFor(data.state, data.district);
  setCache(key, {
    state: normalizeLocation(data.state),
    district: normalizeLocation(data.district),
    evaluation: data.evaluation,
  }, []);
  return key;
}

export function useDistrictEvaluation(
  state: string,
  district: string
) {
  const [data, setData] = useState<DistrictEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<EvaluationError | Error | null>(null);
  const [stale, setStale] = useState(false);
  const [sources, setSources] = useState<string[]>([]);

  useEffect(() => {
    if (!state || !district) {
      setData(null);
      setError(null);
      setLoading(false);
      setStale(false);
      setSources([]);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setData(null);
        setSources([]);

        const result = await getDistrictEvaluation(state, district);
        if (cancelled) return;

        setData(result.data);
        setError(result.error);
        setStale(result.stale);
        setSources(result.sources);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Failed to load data"));
        setData(null);
        setStale(true);
        setSources([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [state, district]);

  return { data, loading, error, stale, sources };
}

export function useStateEvaluation(state: string) {
  const [data, setData] = useState<DistrictEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<EvaluationError | Error | null>(null);
  const [stale, setStale] = useState(false);
  const [sources, setSources] = useState<string[]>([]);

  useEffect(() => {
    if (!state) {
      setData(null);
      setError(null);
      setLoading(false);
      setStale(false);
      setSources([]);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setData(null);
        setSources([]);

        const result = await getStateEvaluation(state);
        if (cancelled) return;

        setData(result.data);
        setError(result.error);
        setStale(result.stale);
        setSources(result.sources);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Failed to load data"));
        setData(null);
        setStale(true);
        setSources([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [state]);

  return { data, loading, error, stale, sources };
}
