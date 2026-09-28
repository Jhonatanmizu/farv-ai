export interface ExperimentalFactors {
  systems: string[];
  identities: string[];
  occupations: string[];
  regions: string[];
}

export interface QuantitativeMetric {
  ita_angle: number;
  ita_category: string;
  monk_tone: number;
  monk_delta_e: number;
  l_star: number;
  a_star: number;
  b_star: number;
  face_detected: boolean;
}

export interface QualitativeAudit {
  prompt_adherence_score: number;
  detected_environment: string;
  visual_markers: string;
  stereotypical_bias_detected: boolean;
  notes: string;
  researcher_verified: boolean;
}

export interface GeneratedImage {
  id: string;
  job_id: string;
  system: string;
  identity_formulation: string;
  occupation: string;
  region: string;
  repetition_index: number;
  prompt_pt: string;
  prompt_en?: string;
  file_path?: string;
  status: 'pending' | 'completed' | 'failed';
  latency_ms?: number;
  error_message?: string;
  created_at: string;
  quantitative_metric?: QuantitativeMetric;
  qualitative_audit?: QualitativeAudit;
}

export interface AuditJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  provider: string;
  repetitions: number;
  total_conditions: number;
  total_images: number;
  completed_images: number;
  failed_images: number;
  created_at: string;
  updated_at: string;
  images?: GeneratedImage[];
}

export interface ToneDistributionItem {
  category: string;
  count: number;
  percentage: number;
}

export interface RegionDisparityItem {
  region: string;
  mean_ita: number;
  monk_tones: number[];
  total_images: number;
}

export interface MetricSummary {
  job_id: string;
  total_audited: number;
  ita_distribution: ToneDistributionItem[];
  monk_distribution: Record<number, number>;
  regional_disparities: RegionDisparityItem[];
  stereotypical_bias_rate: number;
}
