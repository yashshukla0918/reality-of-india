export type EvaluationIndicator = {
  name: string;
  score: number | null;
};

export type EvaluationCategory = {
  category: string;
  indicators: EvaluationIndicator[];
};

export type DistrictEvaluation = {
  state: string;
  district: string;
  evaluation: EvaluationCategory[];
};

export type EvaluationError = {
  message: string;
  causes: string[];
};

export type DistrictEvaluationResponse = {
  data: DistrictEvaluation;
  error: EvaluationError | null;
  stale: boolean;
  sources: string[];
};
