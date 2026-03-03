import { EvaluationReferenceIndex } from "../../constants/indicators/evaludation-reference-index";
import type { DistrictEvaluation } from "../../types/evaluation";

export type NetworkInfo = {
  name: string;
  nodes: number | null;
  indicators: { name: string; score: number | null }[];
};

type CategoryItem = DistrictEvaluation["evaluation"][number];
type EvaluationReferenceItem = (typeof EvaluationReferenceIndex)[number];

export const normalizeKey = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");

const indicatorNameAliases = new Map<string, string>([
  ["median income index", "Median income (PPP-adjusted)"],
  ["employment rate", "Employment rate / job market depth"],
  ["income equality index", "Income inequality (Gini coefficient)"],
  ["housing affordability", "Housing affordability index"],
  ["life expectancy index", "Life expectancy"],
  ["infant mortality rate", "Infant mortality rate"],
  ["healthcare access", "Access to primary & emergency care"],
  ["air quality index score", "Air quality index (AQI)"],
  ["mental health support", "Mental health support availability"],
  ["literacy rate", "Literacy rate"],
  ["crime rate score", "Violent crime rate"],
  ["police trust index", "Police trust levels"],
  ["judicial efficiency", "Judicial efficiency"],
  ["public transport coverage", "Public transport coverage"],
  ["internet reliability", "Internet speed & reliability"],
  ["road quality index", "Road quality & congestion index"],
]);

const normalizeIndicatorLabel = (name: string) =>
  indicatorNameAliases.get(normalizeKey(name)) ?? name;

const referenceIndicatorsByCategory = EvaluationReferenceIndex.reduce(
  (map, category) => {
    map.set(
      category.label.toLowerCase(),
      category.indicators.map((indicator) => indicator.label)
    );
    return map;
  },
  new Map<string, string[]>()
);

const sortIndicatorsByReference = (
  categoryName: string,
  indicators: { name: string; score: number | null }[]
) => {
  const referenceIndicators =
    referenceIndicatorsByCategory.get(categoryName.toLowerCase()) ?? [];
  const indicatorIndexMap = new Map(
    referenceIndicators.map((label, index) => [normalizeKey(label), index])
  );

  return [...indicators].sort((a, b) => {
    const aIndex =
      indicatorIndexMap.get(normalizeKey(normalizeIndicatorLabel(a.name))) ??
      Number.MAX_SAFE_INTEGER;
    const bIndex =
      indicatorIndexMap.get(normalizeKey(normalizeIndicatorLabel(b.name))) ??
      Number.MAX_SAFE_INTEGER;
    if (aIndex === bIndex) {
      return a.name.localeCompare(b.name);
    }
    return aIndex - bIndex;
  });
};

const toCategoryNode = (category: CategoryItem): NetworkInfo => {
  const numericIndicators = category.indicators.filter(
    (indicator) => typeof indicator.score === "number"
  );
  const totalScore = category.indicators.reduce(
    (sum, indicator) =>
      sum + (typeof indicator.score === "number" ? indicator.score : 0),
    0
  );

  return {
    name: category.category,
    nodes:
      numericIndicators.length > 0
        ? Math.round(totalScore / numericIndicators.length)
        : null,
    indicators: sortIndicatorsByReference(category.category, category.indicators),
  };
};

const categoryIndexByLabel = EvaluationReferenceIndex.reduce(
  (indexMap, referenceCategory, index) => {
    indexMap.set(referenceCategory.label.toLowerCase(), index);
    return indexMap;
  },
  new Map<string, number>()
);

const orderedCategories = EvaluationReferenceIndex.map(
  (item): EvaluationReferenceItem["label"] => item.label
);

const sortByEvaluationReference = (a: NetworkInfo, b: NetworkInfo) => {
  const aIndex =
    categoryIndexByLabel.get(a.name.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
  const bIndex =
    categoryIndexByLabel.get(b.name.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
  return aIndex - bIndex;
};

export const networksDataByStateAndDistrict = (
  sourceData: DistrictEvaluation[],
  selectedState: string,
  selectedDistrict?: string
): NetworkInfo[] => {
  if (!selectedState) return [];

  const state = selectedState.trim().toLowerCase();
  const district = selectedDistrict?.trim().toLowerCase();

  const stateRows = sourceData.filter(
    (item) => item.state.trim().toLowerCase() === state
  );
  if (stateRows.length === 0) return [];

  if (district) {
    const districtRow = stateRows.find(
      (item) => item.district.trim().toLowerCase() === district
    );
    if (!districtRow) return [];

    const categoryByLabel = new Map(
      districtRow.evaluation.map((category) => [
        category.category.toLowerCase(),
        toCategoryNode(category),
      ])
    );

    return orderedCategories
      .map((categoryLabel) => categoryByLabel.get(categoryLabel.toLowerCase()))
      .filter((category): category is NetworkInfo => Boolean(category));
  }

  const categoryAccumulator = new Map<
    string,
    {
      total: number;
      count: number;
      indicators: Map<
        string,
        { label: string; total: number; count: number; missing: number }
      >;
    }
  >();

  stateRows.forEach((row) => {
    row.evaluation.forEach((category) => {
      const categoryNode = toCategoryNode(category);
      const existing = categoryAccumulator.get(categoryNode.name);

      if (existing) {
        if (typeof categoryNode.nodes === "number") {
          existing.total += categoryNode.nodes;
          existing.count += 1;
        }

        categoryNode.indicators.forEach((indicator) => {
          const indicatorKey = normalizeKey(normalizeIndicatorLabel(indicator.name));
          const matchedIndicator = existing.indicators.get(indicatorKey);
          if (matchedIndicator) {
            if (typeof indicator.score === "number") {
              matchedIndicator.total += indicator.score;
              matchedIndicator.count += 1;
            } else {
              matchedIndicator.missing += 1;
            }
            return;
          }

          existing.indicators.set(indicatorKey, {
            label: normalizeIndicatorLabel(indicator.name),
            total: typeof indicator.score === "number" ? indicator.score : 0,
            count: typeof indicator.score === "number" ? 1 : 0,
            missing: typeof indicator.score === "number" ? 0 : 1,
          });
        });
      } else {
        const indicators = new Map<
          string,
          { label: string; total: number; count: number; missing: number }
        >();

        categoryNode.indicators.forEach((indicator) => {
          const indicatorLabel = normalizeIndicatorLabel(indicator.name);
          indicators.set(normalizeKey(indicatorLabel), {
            label: indicatorLabel,
            total: typeof indicator.score === "number" ? indicator.score : 0,
            count: typeof indicator.score === "number" ? 1 : 0,
            missing: typeof indicator.score === "number" ? 0 : 1,
          });
        });

        categoryAccumulator.set(categoryNode.name, {
          total: typeof categoryNode.nodes === "number" ? categoryNode.nodes : 0,
          count: typeof categoryNode.nodes === "number" ? 1 : 0,
          indicators,
        });
      }
    });
  });

  return Array.from(categoryAccumulator.entries())
    .map(([name, stats]) => {
      const indicators = Array.from(stats.indicators.values()).map((indicator) => ({
        name: indicator.label,
        score:
          indicator.count > 0 ? Math.round(indicator.total / indicator.count) : null,
      }));

      return {
        name,
        nodes: stats.count > 0 ? Math.round(stats.total / stats.count) : null,
        indicators: sortIndicatorsByReference(name, indicators),
      };
    })
    .sort(sortByEvaluationReference);
};
