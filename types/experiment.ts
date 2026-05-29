export type ExperimentStatus = "draft" | "active" | "paused" | "ended";

export type ExperimentVariantDefinition = {
  key: string;
  label: string;
  payload?: Record<string, string | number | boolean | null>;
};

export type ExperimentDefinition = {
  experiment_key: string;
  description: string;
  status: ExperimentStatus;
  variants: ExperimentVariantDefinition[];
  traffic_allocation: number[];
  default_variant: string;
  start_date?: string;
  end_date?: string;
};

export type ExperimentVariantResult = {
  experimentKey: string;
  variant: string;
  payload: Record<string, string | number | boolean | null>;
  isDefault: boolean;
};
