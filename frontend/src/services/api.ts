
const API_BASE_URL = "http://127.0.0.1:8000";

export interface DatabaseStatus {
  connected: boolean;
  database_path?: string;
  tables?: Record<string, { rows: number }>;
  message?: string;
  error?: string;
}

export interface HealthStatus {
  status: string;
  message: string;
}

export interface ResearchSummary {
  literature_records: number;
  concentration_records: number;
  csv_columns: string[];
  excel_columns: string[];
  concentration_units: Record<string, number>;
  remediation_methods: Record<string, number>;
  organisms: Record<string, number>;
  verification_labels: Record<string, number>;
}

export interface OrganismRecord {
  Authors: string;
  Year: number;
  Title: string;
  Journal: string;
  DOI: string;
  Remediation_Method: string;
  Organism: string;
  Contamination_Source: string;
  Efficacy_Percent: number;
  Temp_C: number;
  pH: number;
}

export interface ConcentrationRecord {
  Microorganism: string;
  "Bioremediation Mechanism": string;
  "Soil Type": string;
  "Lead Contamination Source": string;
  "Initial Pb Concentration": number;
  "Final Pb Concentration": number;
  "Concentration Units": string;
  pH: number;
  "Temperature (°C)"?: number;
  "Temperature (Â°C)"?: number;
  "Treatment Duration": string;
  "Removal Efficiency (%)": string;
  "Primary-Paper DOI / Reference": string;
  "Verification Status": string;
}

async function apiRequest<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const getHealth = () =>
  apiRequest<HealthStatus>("/api/health");

export const getDatabaseStatus = () =>
  apiRequest<DatabaseStatus>("/api/database/status");

export const getResearchSummary = () =>
  apiRequest<ResearchSummary>("/api/research/summary");

export const getOrganismRecords = () =>
  apiRequest<{ total: number; records: OrganismRecord[] }>(
    "/api/research/organisms"
  );

export const getConcentrationRecords = () =>
  apiRequest<{ total: number; records: ConcentrationRecord[] }>(
    "/api/research/concentrations"
  );

// =====================================================
// AI RESEARCH ASSISTANT API
// =====================================================

export interface AIResearchResponse {
  answer: string;
  question: string;
  keywords: string[];
  evidence_count: number;
  matches: {
    type: string;
    score: number;
    record: Record<string, unknown>;
  }[];
  disclaimer: string;
}

export interface AIInsights {
  summary: ResearchSummary;
  insights: {
    topic: string;
    finding: string;
  }[];
}

export interface PredictionReadiness {
  ready: boolean;
  total_records?: number;
  numeric_records?: number;
  verified_records?: number;
  unit_distribution?: Record<string, number>;
  message: string;
  recommendation?: string;
}

export interface ObservedReduction {
  total_numeric_records?: number;
  groups?: {
    unit: string;
    records: number;
    mean_observed_difference_percent: number;
    median_observed_difference_percent: number;
  }[];
  interpretation?: string;
}

export interface SoilHealthAnalysis {
  ready: boolean;
  message: string;
  required_measurements: string[];
  recommendation: string;
}

// Generic POST request
async function apiPost<T>(
  endpoint: string,
  body: unknown
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
// ==========================================================
// Pb-CONTAMINATED SOIL ASSESSMENT
// ==========================================================

export type PbMeasurementField =
  | 'soil_ph'
  | 'electrical_conductivity'
  | 'organic_carbon'
  | 'available_nitrogen'
  | 'available_phosphorus'
  | 'available_potassium'
  | 'microbial_biomass'
  | 'enzyme_activity'
  | 'soil_respiration'
  | 'total_pb'
  | 'extractable_pb'
  | 'leachable_pb';

export type PbSamplingStage =
  | 'initial'
  | 'final'
  | 'intermediate'
  | 'control';

export interface PbSoilAssessmentPayload {
  experiment_id: string;
  sample_id: string;
  sampling_stage: PbSamplingStage;
  sample_date: string;

  district?: string;
  location?: string;
  treatment?: string;
  replicate?: string;
  soil_depth_cm?: number;

  measurements: Partial<
    Record<PbMeasurementField, number>
  >;

  units: Partial<
    Record<PbMeasurementField, string>
  >;

  methods?: Partial<
    Record<PbMeasurementField, string>
  >;

  notes?: string;
}

export interface PbSoilAssessmentSaveResponse {
  success: boolean;
  record_id: number;
  experiment_id: string;
  sample_id: string;
  sampling_stage: PbSamplingStage;
  message: string;
}

export async function savePbSoilAssessment(
  payload: PbSoilAssessmentPayload
): Promise<PbSoilAssessmentSaveResponse> {
  return apiPost<PbSoilAssessmentSaveResponse>(
    '/api/pb-soil-assessment/records',
    payload
  );
}
// ==========================================================
// Pb SOIL ASSESSMENT — READ AND COMPARE
// ==========================================================

export interface PbAssessmentRecordsResponse {
  total: number;
  records: Record<string, unknown>[];
}

export async function getPbSoilAssessmentRecords(
  limit = 100,
  experimentId?: string
): Promise<PbAssessmentRecordsResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (experimentId) {
    params.set('experiment_id', experimentId);
  }

  return apiRequest<PbAssessmentRecordsResponse>(
    `/api/pb-soil-assessment/records?${params.toString()}`
  );
}

export async function comparePbSoilTreatment(
  experimentId: string,
  treatment?: string
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();

  if (treatment) {
    params.set('treatment', treatment);
  }

  const query = params.toString();

  return apiRequest<Record<string, unknown>>(
    `/api/pb-soil-assessment/compare/${encodeURIComponent(experimentId)}${query ? `?${query}` : ''}`
  );
}
// Ask a research question
export const askAIResearch = (question: string) =>
  apiPost<AIResearchResponse>("/api/ai/ask", { question });

// Research insights
export const getAIInsights = () =>
  apiRequest<AIInsights>("/api/ai/insights");

// Microorganism intelligence
export const getAIMicroorganisms = () =>
  apiRequest<{
    total_organisms: number;
    records: {
      organism: string;
      record_count: number;
      methods: string[];
      contamination_sources: string[];
    }[];
    warning: string;
  }>("/api/ai/microorganisms");

// Prediction readiness
export const getPredictionReadiness = () =>
  apiRequest<PredictionReadiness>(
    "/api/ai/prediction/readiness"
  );

// Observed concentration differences
export const getObservedReduction = () =>
  apiRequest<ObservedReduction>(
    "/api/ai/prediction/observed"
  );

// Soil health analysis
export const getSoilHealthAnalysis = () =>
  apiRequest<SoilHealthAnalysis>(
    "/api/ai/soil-health"
  );
    // =====================================================
// SOIL MONITORING FUNCTIONS
// =====================================================

export const getMonitoringStatus = () =>
  apiRequest<MonitoringStatus>("/api/monitoring/status");

export const getLatestSoilReading = () =>
  apiRequest<{ reading: SoilReading | null }>(
    "/api/monitoring/latest"
  );

export const getSoilReadingHistory = (limit = 100) =>
  apiRequest<{ total: number; records: SoilReading[] }>(
    `/api/monitoring/history?limit=${limit}`
  );

export const submitSoilReading = (reading: SoilReading) =>
  apiPost<{
    success: boolean;
    id: number;
    recorded_at: string;
    source: string;
  }>("/api/monitoring/readings", reading);
// =====================================================
// SOIL MONITORING API
// =====================================================

export interface SoilReading {
  id?: number;
  recorded_at?: string;
  source: string;
  moisture?: number | null;
  ph?: number | null;
  temperature?: number | null;
  ec?: number | null;
  lead_mg_kg?: number | null;
  other_metals?: string | null;
  microorganisms?: string | null;
  notes?: string | null;
  district_id?: string | null;
district_name?: string | null;
mandal?: string | null;
village?: string | null;
latitude?: number | null;
longitude?: number | null;
}

export const getDistrictMonitoringSummary = (districtId: string) =>
  apiRequest<{
    district_id: string;
    total_readings: number;
    latest_reading: SoilReading | null;
  }>(`/api/monitoring/district/${encodeURIComponent(districtId)}`);

export const getDistrictMonitoringHistory = (
  districtId: string,
  limit = 100
) =>
  apiRequest<{
    district_id: string;
    total: number;
    records: SoilReading[];
  }>(
    `/api/monitoring/district/${encodeURIComponent(districtId)}/history?limit=${limit}`
  )

export interface MonitoringStatus {
  database_connected: boolean;
  total_readings: number;
  latest_reading: {
    recorded_at: string;
    source: string;
  } | null;
  automatic_sensor_connection: boolean;
  message: string;
}
export interface TelanganaDistrict {
  id: string;
  name: string;
  profile_status: string;
  soil_types: string[];
  data_available: boolean;
}

export interface TelanganaDistrictResponse {
  state: string;
  total_districts: number;
  districts: TelanganaDistrict[];
}

export const getTelanganaDistricts = () =>
  apiRequest<TelanganaDistrictResponse>("/api/telangana/districts");

export const getTelanganaDistrict = (districtId: string) =>
  apiRequest<TelanganaDistrict>(
    `/api/telangana/districts/${encodeURIComponent(districtId)}`
  );

export interface SoilSurveyProject {
  id: string
  title: string
  scale: string
  base_year: string | null
  historical_districts: string[]
  source_organisation: string
  source_url: string
  data_type: string
  verification_status: string
  boundary_alignment: string
}

export interface SoilSurveyResponse {
  state: string
  total_projects: number
  projects: SoilSurveyProject[]
}

export const getTelanganaSoilSurveys = () =>
  apiRequest<SoilSurveyResponse>('/api/telangana/soil-surveys')
// =====================================================
// SOIL HEALTH CARD — TELANGANA DATASET API
// =====================================================

export interface SoilHealthCardDistrict {
  name: string;
  records: number;
}

export interface SoilHealthCardSummary {
  dataset: string;
  state: string;
  reporting_years: string[];
  total_records: number;
  total_districts: number;
  total_blocks: number;
  total_villages: number;
  districts: SoilHealthCardDistrict[];
  nutrient_names: string[];
  nutrient_types: string[];
  nutrient_levels: string[];
  value_definition: string;
  source_file: string;
}

export interface SoilHealthCardFilters {
  districts: string[];
  blocks: string[];
  villages: string[];
  nutrient_names: string[];
  nutrient_types: string[];
  nutrient_levels: string[];
}

export interface SoilHealthCardRecord {
  _id: number;
  id: number;
  year: string;
  state_name: string;
  state_code: number;
  district_name: string;
  district_code: number;
  block_name: string;
  block_code: number;
  village_name: string;
  village_code: number;
  nutrient_type: string;
  nutrient_name: string;
  nutrient_level: string;
  value: number;
}

export interface SoilHealthCardRecordsResponse {
  total: number;
  records: SoilHealthCardRecord[];
  filters_applied: {
    district_name: string | null;
    block_name: string | null;
    village_name: string | null;
    nutrient_name: string | null;
    nutrient_type: string | null;
  };
}

export const getSoilHealthCardSummary = () =>
  apiRequest<SoilHealthCardSummary>(
    "/api/soil-health-card/summary"
  );

export const getSoilHealthCardFilters = (
  districtName?: string,
  blockName?: string
) => {
  const params = new URLSearchParams();

  if (districtName) params.set("district_name", districtName);
  if (blockName) params.set("block_name", blockName);

  return apiRequest<SoilHealthCardFilters>(
    `/api/soil-health-card/filters?${params.toString()}`
  );
};

export const getSoilHealthCardRecords = (filters: {
  district_name?: string;
  block_name?: string;
  village_name?: string;
  nutrient_name?: string;
  nutrient_type?: string;
}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  return apiRequest<SoilHealthCardRecordsResponse>(
    `/api/soil-health-card/records?${params.toString()}`
  );
};