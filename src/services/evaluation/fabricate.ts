import { EvaluationReferenceIndex } from "../../constants/indicators/evaludation-reference-index";
import type { DistrictEvaluation } from "../../types/evaluation";
import type {
  EvaluationSignalKey,
  EvaluationSignalValue,
} from "./providers";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeMinMax(
  value: number | null | undefined,
  min: number,
  max: number,
  invert = false
) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (max === min) return null;

  let score = ((value - min) / (max - min)) * 100;
  if (invert) score = 100 - score;
  return clampScore(score);
}

type BuildEvaluationInput = {
  state: string;
  district: string;
  signals: Partial<Record<EvaluationSignalKey, EvaluationSignalValue>>;
};

export function buildEvaluationData({
  state,
  district,
  signals,
}: BuildEvaluationInput): DistrictEvaluation {
  const gdpScore = normalizeMinMax(signals.gdp ?? null, 1000, 15000);
  const employmentScore = normalizeMinMax(
    signals.unemployment ?? null,
    0,
    20,
    true
  );
  const inequalityScore = normalizeMinMax(signals.gini ?? null, 25, 50, true);
  const lifeScore = normalizeMinMax(signals.lifeExpectancy ?? null, 50, 85);
  const infantMortalityScore = normalizeMinMax(
    signals.infantMortality ?? null,
    1,
    80,
    true
  );
  const literacyRateScore = normalizeMinMax(signals.literacyRate ?? null, 30, 100);
  const aqiScore = normalizeMinMax(signals.aqi ?? null, 0, 300, true);
  const climateRiskScore = normalizeMinMax(signals.windSpeed ?? null, 0, 50, true);
  const workHoursScore = normalizeMinMax(signals.temperature ?? null, 10, 42, true);
  const commuteScore = normalizeMinMax(signals.humidity ?? null, 20, 95, true);

  const indicatorScoreByCode = new Map<string, number | null>([
    ["MEDIAN_INCOME_PPP", gdpScore],
    ["EMPLOYMENT_RATE", employmentScore],
    ["INCOME_INEQUALITY_GINI", inequalityScore],
    ["LIFE_EXPECTANCY", lifeScore],
    ["INFANT_MORTALITY", infantMortalityScore],
    ["AIR_QUALITY_INDEX", aqiScore],
    ["LITERACY_RATE", literacyRateScore],
    ["CLIMATE_RISK", climateRiskScore],
    ["AVERAGE_WORK_HOURS", workHoursScore],
    ["COMMUTE_TIME", commuteScore],
  ]);

  return {
    state,
    district,
    evaluation: EvaluationReferenceIndex.map((category) => ({
      category: category.label,
      indicators: category.indicators.map((indicator) => ({
        name: indicator.label,
        score: indicatorScoreByCode.get(indicator.code) ?? null,
      })),
    })),
  };
}

