
import { useEffect, useMemo, useState } from 'react'

import {
  askAIResearch,
  getAIInsights,
  getAIMicroorganisms,
  getPredictionReadiness,
  getObservedReduction,
  getSoilHealthAnalysis,
  getSoilHealthCardSummary,
  getSoilHealthCardFilters,
  getSoilHealthCardRecords,
  savePbSoilAssessment,
  getPbSoilAssessmentRecords,
  comparePbSoilTreatment,
  getConcentrationRecords,
} from './services/api'

import type {
  ConcentrationRecord,
  AIResearchResponse,
  AIInsights,
  PredictionReadiness,
  ObservedReduction,
  SoilHealthAnalysis,
  SoilHealthCardSummary,
  SoilHealthCardFilters,
  SoilHealthCardRecord,
  PbSoilAssessmentPayload,
  PbAssessmentRecordsResponse,
  PbMeasurementField,
  PbSamplingStage,
} from './services/api'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'


import {
  BrainCircuit,
  Send,
  Microscope,
  FlaskConical,
  BarChart3,
  RefreshCw,
  Save,
  Database,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  Beaker,
  Dna,
  Sprout,
  TrendingUp,
  FileSearch,
  Search,
  Target,
} from 'lucide-react'

type MicroorganismData = Awaited<
  ReturnType<typeof getAIMicroorganisms>
>

type TabName =
  | 'Study Evidence'
  | 'Mechanisms'
  | 'Experimental Conditions'
  | 'Soil Health'
  | 'Pb Soil Assessment'
  | 'Prediction Models'
  | 'Research Gaps'
const tabs: TabName[] = [
  'Study Evidence',
  'Mechanisms',
  'Experimental Conditions',
  'Soil Health',
  'Pb Soil Assessment',
  'Prediction Models',
  'Research Gaps',
]

const mechanisms = [
  {
    name: 'Biosorption',
    description:
      'Passive binding of dissolved lead ions to functional groups on microbial cell surfaces or extracellular materials. It can occur with living or non-living biomass.',
    measurements:
      'Dissolved Pb before and after treatment, Pb associated with biomass, pH, adsorption capacity and desorption behaviour.',
    limitation:
      'A decrease in solution Pb indicates transfer to another phase. It does not demonstrate destruction of lead.',
  },
  {
    name: 'Bioaccumulation',
    description:
      'Uptake and retention of lead by living microbial cells through transport and intracellular binding or sequestration.',
    measurements:
      'Pb in washed and digested biomass, microbial viability, intracellular Pb where possible and dissolved Pb mass balance.',
    limitation:
      'Lead-containing biomass becomes a secondary hazardous material requiring controlled handling.',
  },
  {
    name: 'Bioimmobilization',
    description:
      'Microbial activity changes lead chemistry or its association with soil components, reducing mobility or bioavailability.',
    measurements:
      'Total Pb, extractable Pb, porewater Pb, leachability, soil pH and stability under environmental stress.',
    limitation:
      'Immobilization can reduce exposure while total soil Pb remains largely unchanged.',
  },
  {
    name: 'Biomineralization',
    description:
      'Microbial metabolism can create chemical conditions that favour the formation of sparingly soluble lead-containing mineral phases.',
    measurements:
      'Solid-phase Pb, mineral identification, microscopy, elemental analysis, leachability and mass balance.',
    limitation:
      'A precipitated phase must be identified and tested for stability. Precipitation does not guarantee permanent containment.',
  },
  {
    name: 'Phytoremediation and Rhizoremediation',
    description:
      'Plants and root-associated microorganisms influence lead uptake, retention, stabilization or extraction in the rhizosphere.',
    measurements:
      'Pb in roots and shoots, soil Pb fractions, plant biomass, plant health and harvested biomass management.',
    limitation:
      'Plant uptake transfers Pb into biomass. Safe harvesting and disposal are essential.',
  },
]

const researchGaps = [
  {
    title: 'Comparable total-Pb measurements',
    priority: 'Very high',
    description:
      'Many reported outcomes concern extractable Pb or leachability rather than total soil Pb. Future work should report total and available Pb separately.',
    experiment:
      'Measure total Pb, extractable Pb and leachability before and after treatment using validated analytical methods.',
  },
  {
    title: 'Experimental condition reporting',
    priority: 'High',
    description:
      'Missing pH, temperature, dosage and treatment duration limit reproducibility and meaningful comparisons.',
    experiment:
      'Use a structured experimental design with recorded pH, temperature, initial Pb concentration, dosage and sampling time.',
  },
  {
    title: 'Long-term immobilization stability',
    priority: 'Very high',
    description:
      'Short laboratory studies do not establish whether immobilized Pb remains stable during wetting, drying or pH changes.',
    experiment:
      'Evaluate treated soil through repeated wet-dry cycles and controlled pH changes.',
  },
  {
    title: 'Microbial consortium compatibility',
    priority: 'High',
    description:
      'Individual strains and mixed cultures need comparison under equivalent experimental conditions.',
    experiment:
      'Test pairwise compatibility and compare individual isolates with selected consortia.',
  },
  {
    title: 'Field-scale validation',
    priority: 'High',
    description:
      'Laboratory findings need validation in real contaminated soils with spatial and chemical variability.',
    experiment:
      'Progress from controlled microcosms to replicated experiments using characterized field soil.',
  },
  {
    title: 'Reliable predictive datasets',
    priority: 'Very high',
    description:
      'Inconsistent units, missing metadata and uncertain references can produce misleading predictive models.',
    experiment:
      'Create a verified, study-level dataset with consistent units, source checks and documented endpoints.',
  },
]

const styles = `
.ai-workspace {
  color:var(--text-primary,#e7eee9);
  display:flex;
  flex-direction:column;
  gap:20px;
  width:100%;
  padding-bottom:35px;
}
.ai-header {
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:15px;
  flex-wrap:wrap;
}
.ai-heading h2 {margin:0 0 7px;font-size:26px}
.ai-heading p {
  margin:0;
  color:var(--text-secondary,#94a69c);
  font-size:12px;
  line-height:1.6;
}
.ai-live {
  display:inline-flex;
  align-items:center;
  gap:8px;
  border:1px solid var(--border-color,#35483f);
  border-radius:30px;
  padding:8px 12px;
  font-size:11px;
  color:var(--text-secondary,#9eb3a8);
}
.ai-live-dot {width:8px;height:8px;border-radius:50%;background:#38b77b}
.ai-tabs {
  display:flex;
  gap:7px;
  flex-wrap:wrap;
  border-bottom:1px solid var(--border-color,#34463e);
  padding-bottom:12px;
}
.ai-tabs button {
  border:1px solid var(--border-color,#34463e);
  background:var(--card-background,#17251f);
  color:var(--text-secondary,#a5b6ac);
  border-radius:9px;
  padding:10px 12px;
  font-size:11px;
  font-weight:650;
  cursor:pointer;
}
.ai-tabs button.active {background:#23634e;color:white;border-color:#23634e}
.ai-grid {
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:12px;
}
.ai-card,.ai-panel {
  min-width:0;
  background:var(--card-background,#17251f);
  border:1px solid var(--border-color,#30443a);
  border-radius:14px;
  padding:16px;
}
.ai-card-label {
  display:flex;
  align-items:center;
  gap:8px;
  font-size:11px;
  color:var(--text-secondary,#a5b6ac);
}
.ai-card-value {font-size:25px;font-weight:750;margin:12px 0 5px}
.ai-card-note {
  color:var(--text-secondary,#8fa397);
  font-size:10px;
  line-height:1.5;
}
.ai-panel h3 {margin:0 0 6px;font-size:15px}
.ai-panel h4 {font-size:12px;margin:0 0 7px}
.ai-panel-description {
  color:var(--text-secondary,#92a69a);
  font-size:11px;
  line-height:1.6;
  margin:0 0 15px;
}
.ai-two-col {
  display:grid;
  grid-template-columns:1.15fr .85fr;
  gap:13px;
}
.ai-three-col {
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:12px;
}
.ai-section-title {
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}
.ai-section-title h3 {font-size:16px;margin:0}
.ai-button {
  display:inline-flex;
  justify-content:center;
  align-items:center;
  gap:7px;
  border:1px solid var(--border-color,#3b5145);
  border-radius:9px;
  padding:10px 13px;
  color:var(--text-primary,#e7eee9);
  background:var(--card-background,#1d3027);
  font-size:11px;
  font-weight:650;
  cursor:pointer;
}
.ai-button.primary {background:#23634e;color:white;border-color:#23634e}
.ai-button:disabled {opacity:.55;cursor:not-allowed}
.ai-input,.ai-select {
  width:100%;
  background:var(--input-background,#101b16);
  color:var(--text-primary,#e7eee9);
  border:1px solid var(--border-color,#3b5145);
  border-radius:9px;
  padding:11px;
  font:inherit;
  font-size:12px;
}
.ai-label {
  display:block;
  font-size:11px;
  color:var(--text-secondary,#a5b6ac);
  margin-bottom:7px;
}
.ai-field {min-width:0}
.ai-form-grid {
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:12px;
}
.ai-chat {display:flex;flex-direction:column;gap:12px}
.ai-chat-form {display:flex;gap:8px}
.ai-chat-message {
  border:1px solid var(--border-color,#34483e);
  background:var(--input-background,#101b16);
  border-radius:11px;
  padding:13px;
  font-size:12px;
  line-height:1.7;
  white-space:pre-wrap;
}
.ai-chat-message.question {border-left:3px solid #4c9c7c}
.ai-chat-message.answer {border-left:3px solid #6c91c4}
.ai-muted {
  color:var(--text-secondary,#92a69a);
  font-size:11px;
  line-height:1.6;
}
.ai-notice {
  border:1px solid #9a793b;
  background:rgba(163,119,39,.12);
  border-radius:11px;
  padding:13px;
  font-size:11px;
  line-height:1.7;
}
.ai-success {
  border:1px solid #3d8b68;
  background:rgba(43,139,93,.12);
  border-radius:11px;
  padding:13px;
  font-size:11px;
  line-height:1.7;
}
.ai-list {display:flex;flex-direction:column;gap:8px}
.ai-list-item {
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  border-bottom:1px solid var(--border-color,#30443a);
  padding:9px 0;
  font-size:11px;
}
.ai-pill {
  display:inline-block;
  border-radius:20px;
  padding:4px 8px;
  font-size:9px;
  font-weight:700;
  background:rgba(63,151,112,.16);
  color:#75c9a0;
}
.ai-pill.warning {background:rgba(196,143,50,.15);color:#e2b967}
.ai-evidence {
  border:1px solid var(--border-color,#34483e);
  border-radius:10px;
  padding:12px;
  margin-top:10px;
  overflow-wrap:anywhere;
}
.ai-evidence p {
  margin:4px 0;
  font-size:10px;
  line-height:1.6;
  color:var(--text-secondary,#a5b6ac);
}
.ai-empty {
  padding:18px;
  text-align:center;
  color:var(--text-secondary,#92a69a);
  font-size:12px;
  border:1px dashed var(--border-color,#3c5146);
  border-radius:10px;
}
.ai-chart {width:100%;height:270px}
.ai-footer {
  text-align:center;
  font-size:10px;
  color:var(--text-secondary,#83968a);
  padding:12px;
}
.ai-mechanism {
  border:1px solid var(--border-color,#34483e);
  background:var(--input-background,#101b16);
  border-radius:11px;
  padding:14px;
  margin-bottom:10px;
}
.ai-mechanism p {font-size:11px;line-height:1.7;color:var(--text-secondary,#a5b6ac)}
.ai-gap {
  border:1px solid var(--border-color,#34483e);
  border-radius:12px;
  padding:14px;
}
.ai-gap p {font-size:11px;line-height:1.65;color:var(--text-secondary,#a5b6ac)}
.ai-gap small {font-size:10px;color:#d5b46d}
@media(max-width:1000px) {
  .ai-grid {grid-template-columns:repeat(2,minmax(0,1fr))}
  .ai-two-col {grid-template-columns:1fr}
}
@media(max-width:650px) {
  .ai-three-col,.ai-form-grid {grid-template-columns:1fr}
  .ai-heading h2 {font-size:21px}
  .ai-chat-form {flex-direction:column}
  .ai-tabs button {flex:1 1 auto}
}
`
function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value)
  }

  return JSON.stringify(value)
}
function safeNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readable(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Not reported'
  }
  return String(value)
}

export type { TabName }

function AIWorkspace({ initialTab = 'Study Evidence' }: { initialTab?: TabName }) {
  const [activeTab, setActiveTab] = useState<TabName>(initialTab)

  const [question, setQuestion] = useState('')
  const [chat, setChat] = useState<AIResearchResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [insights, setInsights] = useState<AIInsights | null>(null)
  const [microbes, setMicrobes] = useState<MicroorganismData | null>(null)
  const [readiness, setReadiness] = useState<PredictionReadiness | null>(null)
  const [observed, setObserved] = useState<ObservedReduction | null>(null)
  const [soil, setSoil] = useState<SoilHealthAnalysis | null>(null)
  
// Telangana Soil Health Card dataset
const [soilCardSummary, setSoilCardSummary] =
  useState<SoilHealthCardSummary | null>(null)

const [soilCardFilters, setSoilCardFilters] =
  useState<SoilHealthCardFilters | null>(null)

const [soilCardRecords, setSoilCardRecords] =
  useState<SoilHealthCardRecord[]>([])

  // Lead concentration research records
const [leadRecords, setLeadRecords] =
  useState<ConcentrationRecord[]>([])

const [leadLoading, setLeadLoading] = useState(false)
const [leadError, setLeadError] = useState('')
const [leadSearch, setLeadSearch] = useState('')


const [soilCardLoading, setSoilCardLoading] = useState(false)
const [soilCardError, setSoilCardError] = useState('')

const [districtFilter, setDistrictFilter] = useState('')
const [blockFilter, setBlockFilter] = useState('')
const [villageFilter, setVillageFilter] = useState('')
const [nutrientFilter, setNutrientFilter] = useState('')
const [nutrientTypeFilter, setNutrientTypeFilter] = useState('')
const [levelFilter, setLevelFilter] = useState('')
const [soilSearch, setSoilSearch] = useState('')
const [soilPage, setSoilPage] = useState(1)

const SOIL_PAGE_SIZE = 10


  const [refreshing, setRefreshing] = useState(false)
  const [dataError, setDataError] = useState('')
  const [selectedMechanism, setSelectedMechanism] = useState(0)
  const [evidenceSearch, setEvidenceSearch] = useState('')

  const [matrix, setMatrix] = useState('Soil')
  const [initialPb, setInitialPb] = useState('500')
  const [ph, setPh] = useState('6.5')
  const [temperature, setTemperature] = useState('30')
  const [duration, setDuration] = useState('30')
  const [dosage, setDosage] = useState('1')
  const [organism, setOrganism] = useState('Bacterial isolate')
  const [designCreated, setDesignCreated] = useState(false)

// ==========================================================
// Pb SOIL ASSESSMENT STATE
// ==========================================================

const [pbExperimentId, setPbExperimentId] = useState('')
const [pbSampleId, setPbSampleId] = useState('')
const [pbSamplingStage, setPbSamplingStage] =
  useState<PbSamplingStage>('initial')

const [pbSampleDate, setPbSampleDate] = useState(() => {
  const today = new Date()
  return new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10)
})

const [pbDistrict, setPbDistrict] = useState('Telangana')
const [pbLocation, setPbLocation] = useState('')
const [pbTreatment, setPbTreatment] = useState('')
const [pbReplicate, setPbReplicate] = useState('')
const [pbSoilDepth, setPbSoilDepth] = useState('')
const [pbNotes, setPbNotes] = useState('')

const pbMeasurementFields: {
  field: PbMeasurementField
  label: string
  defaultUnit: string
}[] = [
  { field: 'soil_ph', label: 'Soil pH', defaultUnit: 'pH' },
  { field: 'electrical_conductivity', label: 'Electrical conductivity', defaultUnit: 'dS/m' },
  { field: 'organic_carbon', label: 'Organic carbon', defaultUnit: '%' },
  { field: 'available_nitrogen', label: 'Available nitrogen', defaultUnit: 'mg/kg' },
  { field: 'available_phosphorus', label: 'Available phosphorus', defaultUnit: 'mg/kg' },
  { field: 'available_potassium', label: 'Available potassium', defaultUnit: 'mg/kg' },
  { field: 'microbial_biomass', label: 'Microbial biomass', defaultUnit: '' },
  { field: 'enzyme_activity', label: 'Soil enzyme activity', defaultUnit: '' },
  { field: 'soil_respiration', label: 'Soil respiration', defaultUnit: '' },
  { field: 'total_pb', label: 'Total lead', defaultUnit: 'mg/kg' },
  { field: 'extractable_pb', label: 'Extractable lead', defaultUnit: 'mg/kg' },
  { field: 'leachable_pb', label: 'Leachable lead', defaultUnit: 'mg/kg' },
]

const [pbMeasurements, setPbMeasurements] = useState<
  Partial<Record<PbMeasurementField, string>>
>({})

const [pbUnits, setPbUnits] = useState<
  Partial<Record<PbMeasurementField, string>>
>(() =>
  Object.fromEntries(
    pbMeasurementFields.map(item => [
      item.field,
      item.defaultUnit,
    ])
  ) as Partial<Record<PbMeasurementField, string>>
)

const [pbMethods, setPbMethods] = useState<
  Partial<Record<PbMeasurementField, string>>
>({})

const [pbSaving, setPbSaving] = useState(false)
const [pbLoading, setPbLoading] = useState(false)
const [pbError, setPbError] = useState('')
const [pbSuccess, setPbSuccess] = useState('')

const [pbRecords, setPbRecords] =
  useState<PbAssessmentRecordsResponse | null>(null)

const [pbCompareExperiment, setPbCompareExperiment] = useState('')
const [pbCompareTreatment, setPbCompareTreatment] = useState('')
const [pbComparison, setPbComparison] =
  useState<Record<string, unknown> | null>(null)
const [pbComparing, setPbComparing] = useState(false)
const [pbComparisonError, setPbComparisonError] = useState('')


  
  // ==========================================================
  // LOAD MAIN AI RESEARCH DATA
  // ==========================================================

  async function loadAIData() {
    setRefreshing(true)
    setDataError('')

    try {
      const results = await Promise.allSettled([
        getAIInsights(),
        getAIMicroorganisms(),
        getPredictionReadiness(),
        getObservedReduction(),
        getSoilHealthAnalysis(),
      ])

      let failures = 0

      if (results[0].status === 'fulfilled') {
        setInsights(results[0].value)
      } else {
        failures++
      }

      if (results[1].status === 'fulfilled') {
        setMicrobes(results[1].value)
      } else {
        failures++
      }

      if (results[2].status === 'fulfilled') {
        setReadiness(results[2].value)
      } else {
        failures++
      }

      if (results[3].status === 'fulfilled') {
        setObserved(results[3].value)
      } else {
        failures++
      }

      if (results[4].status === 'fulfilled') {
        setSoil(results[4].value)
      } else {
        failures++
      }

      if (failures === 5) {
        setDataError(
          'The research API could not be reached. Check that the FastAPI backend is running.'
        )
      } else if (failures > 0) {
        setDataError(
          `${failures} data section(s) could not be loaded. Other available sections remain accessible.`
        )
      }
    } catch (error) {
      console.error('Error loading AI research data:', error)
      setDataError(
        'Unable to load research data. Please check the backend connection.'
      )
    } finally {
      setRefreshing(false)
    }
  }

  // ==========================================================
  // LOAD LEAD CONCENTRATION RESEARCH RECORDS
  // ==========================================================

  async function loadLeadRecords() {
    setLeadLoading(true)
    setLeadError('')

    try {
      const response = await getConcentrationRecords()
      setLeadRecords(response.records || [])
    } catch (error) {
      console.error('Error loading lead records:', error)
      setLeadError(
        'Unable to load lead concentration research records.'
      )
    } finally {
      setLeadLoading(false)
    }
  }

  // ==========================================================
  // INITIAL DATA LOADING
  // ==========================================================

  useEffect(() => {
    void loadAIData()
  }, [])

  // Load Pb research records when Soil Health tab opens
  useEffect(() => {
    if (activeTab === 'Soil Health') {
      void loadLeadRecords()
    }
  }, [activeTab])


  // Load AI data when the component first opens
  useEffect(() => {
    void loadAIData()
  }, [])
useEffect(() => {
  void loadAIData()
}, [])

useEffect(() => {
  if (activeTab === 'Soil Health') {
    void loadLeadRecords()
  }
}, [activeTab])
  // ==========================================================
  // SOIL HEALTH CARD: LOAD SUMMARY AND FILTERS
  // ==========================================================

  useEffect(() => {
    if (activeTab !== 'Soil Health') return

    let cancelled = false

    async function loadSoilCardOverview() {
      setSoilCardLoading(true)
      setSoilCardError('')

      try {
        const [summary, filters] = await Promise.all([
          getSoilHealthCardSummary(),
          getSoilHealthCardFilters(),
        ])

        if (cancelled) return

        setSoilCardSummary(summary)
        setSoilCardFilters(filters)
      } catch {
        if (!cancelled) {
          setSoilCardError(
            'Unable to load the Soil Health Card dataset. Check the backend and dataset path.'
          )
        }
      } finally {
        if (!cancelled) {
          setSoilCardLoading(false)
        }
      }
    }

    void loadSoilCardOverview()

    return () => {
      cancelled = true
    }
  }, [activeTab])

  // ==========================================================
  // SOIL HEALTH CARD: LOAD FILTERED RECORDS
  // ==========================================================

  useEffect(() => {
    if (activeTab !== 'Soil Health') return

    let cancelled = false

    async function loadSoilCardRecords() {
      setSoilCardLoading(true)
      setSoilCardError('')

      try {
        const [recordsResponse, filtersResponse] = await Promise.all([
          getSoilHealthCardRecords({
            district_name: districtFilter || undefined,
            block_name: blockFilter || undefined,
            village_name: villageFilter || undefined,
            nutrient_name: nutrientFilter || undefined,
            nutrient_type: nutrientTypeFilter || undefined,
          }),

          getSoilHealthCardFilters(
            districtFilter || undefined,
            blockFilter || undefined
          ),
        ])

        if (cancelled) return

        setSoilCardRecords(recordsResponse.records)
        setSoilCardFilters(filtersResponse)
        setSoilPage(1)
      } catch {
        if (!cancelled) {
          setSoilCardError(
            'Unable to retrieve soil health records for the selected filters.'
          )
        }
      } finally {
        if (!cancelled) {
          setSoilCardLoading(false)
        }
      }
    }

    void loadSoilCardRecords()

    return () => {
      cancelled = true
    }
  }, [
    activeTab,
    districtFilter,
    blockFilter,
    villageFilter,
    nutrientFilter,
    nutrientTypeFilter,
  ])

  // ==========================================================
  // PB SOIL ASSESSMENT: LOAD RECORDS WHEN TAB OPENS
  // IMPORTANT: THIS EFFECT MUST BE OUTSIDE OTHER FUNCTIONS
  // ==========================================================

  useEffect(() => {
    if (activeTab !== 'Pb Soil Assessment') return

    void loadPbAssessmentRecords()
  }, [activeTab])


  async function sendQuestion() {
    const submittedQuestion = question.trim()
    if (!submittedQuestion || loading) return

    setLoading(true)
    setError('')

    try {
      const response = await askAIResearch(submittedQuestion)
      setChat(previous => [...previous, response])
      setQuestion('')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to retrieve an AI research response. Check the backend connection.'
      )
    } finally {
      setLoading(false)
    }
  }

async function loadPbAssessmentRecords() {
  setPbLoading(true)
  setPbError('')

  try {
    const response = await getPbSoilAssessmentRecords(
      100,
      pbExperimentId.trim() || undefined
    )

    setPbRecords(response)
  } catch (error) {
    setPbError(
      error instanceof Error
        ? error.message
        : 'Unable to load Pb assessment records.'
    )
  } finally {
    setPbLoading(false)
  }
}

// ==========================================================
// Pb SOIL ASSESSMENT: SAVE RECORD
// ==========================================================

async function handleSavePbAssessment() {
  if (pbSaving) return

  setPbError('')
  setPbSuccess('')

  if (!pbExperimentId.trim() || !pbSampleId.trim()) {
    setPbError('Experiment ID and sample ID are required.')
    return
  }

  const measurements: Partial<
    Record<PbMeasurementField, number>
  > = {}

  const units: Partial<
    Record<PbMeasurementField, string>
  > = {}

  const methods: Partial<
    Record<PbMeasurementField, string>
  > = {}

  for (const item of pbMeasurementFields) {
    const rawValue = pbMeasurements[item.field]?.trim()

    if (!rawValue) continue

    const value = Number(rawValue)
    const unit = pbUnits[item.field]?.trim()

    if (!Number.isFinite(value) || value < 0) {
      setPbError(
        `Enter a valid non-negative value for ${item.label}.`
      )
      return
    }

    if (item.field === 'soil_ph' && value > 14) {
      setPbError('Soil pH must be between 0 and 14.')
      return
    }

    if (!unit) {
      setPbError(`Please enter the unit for ${item.label}.`)
      return
    }

    measurements[item.field] = value
    units[item.field] = unit

    const method = pbMethods[item.field]?.trim()
    if (method) {
      methods[item.field] = method
    }
  }

  if (Object.keys(measurements).length === 0) {
    setPbError('Enter at least one soil measurement.')
    return
  }

  const depth = pbSoilDepth.trim()
    ? Number(pbSoilDepth)
    : undefined

  if (
    depth !== undefined &&
    (!Number.isFinite(depth) || depth <= 0)
  ) {
    setPbError('Soil depth must be a positive number.')
    return
  }

  const payload: PbSoilAssessmentPayload = {
    experiment_id: pbExperimentId.trim(),
    sample_id: pbSampleId.trim(),
    sampling_stage: pbSamplingStage,
    sample_date: pbSampleDate,
    district: pbDistrict.trim() || undefined,
    location: pbLocation.trim() || undefined,
    treatment: pbTreatment.trim() || undefined,
    replicate: pbReplicate.trim() || undefined,
    soil_depth_cm: depth,
    measurements,
    units,
    methods,
    notes: pbNotes.trim() || undefined,
  }

  setPbSaving(true)

  try {
    await savePbSoilAssessment(payload)

    setPbSuccess('Pb soil assessment saved successfully.')

    setPbSampleId('')
    setPbNotes('')
    setPbMeasurements({})
    setPbMethods({})

    await loadPbAssessmentRecords()
  } catch (error) {
    setPbError(
      error instanceof Error
        ? error.message
        : 'Unable to save Pb assessment.'
    )
  } finally {
    setPbSaving(false)
  }
}

// ==========================================================
// Pb SOIL ASSESSMENT: COMPARE TREATMENTS
// ==========================================================

async function handleComparePbTreatment() {
  if (pbComparing) return

  setPbComparisonError('')
  setPbComparison(null)

  if (!pbCompareExperiment.trim()) {
    setPbComparisonError('Enter an experiment ID to compare.')
    return
  }

  setPbComparing(true)

  try {
    const response = await comparePbSoilTreatment(
      pbCompareExperiment.trim(),
      pbCompareTreatment.trim() || undefined
    )

    setPbComparison(response)
  } catch (error) {
    setPbComparisonError(
      error instanceof Error
        ? error.message
        : 'Unable to compare treatment measurements.'
    )
  } finally {
    setPbComparing(false)
  }
}

  const microorganismChart = useMemo(() => {
    return (microbes?.records ?? [])
      .filter(item => safeNumber(item.record_count) !== null)
      .slice()
      .sort((a, b) => b.record_count - a.record_count)
      .slice(0, 10)
      .map(item => ({
        name: item.organism.length > 23
          ? `${item.organism.slice(0, 20)}...`
          : item.organism,
        records: item.record_count,
      }))
  }, [microbes])

  const observedChart = useMemo(() => {
    return (observed?.groups ?? [])
      .filter(item => Number.isFinite(item.mean_observed_difference_percent))
      .map(item => ({
        unit: item.unit,
        mean: Number(item.mean_observed_difference_percent.toFixed(2)),
        records: item.records,
      }))
  }, [observed])

  const filteredInsights = useMemo(() => {
    const search = evidenceSearch.toLowerCase().trim()
    return (insights?.insights ?? []).filter(item =>
      `${item.topic} ${item.finding}`.toLowerCase().includes(search)
    )
  }, [insights, evidenceSearch])

  function createExperimentalDesign() {
    const pb = Number(initialPb)
    const p = Number(ph)
    const temp = Number(temperature)
    const days = Number(duration)
    const dose = Number(dosage)

    if (
      !Number.isFinite(pb) || pb <= 0 ||
      !Number.isFinite(p) || p < 1 || p > 14 ||
      !Number.isFinite(temp) || temp < 10 || temp > 45 ||
      !Number.isFinite(days) || days < 1 || days > 365 ||
      !Number.isFinite(dose) || dose <= 0
    ) {
      setDesignCreated(false)
      return
    }

    setDesignCreated(true)
  }

  function exportDesign() {
    const content = [
      'Parameter,Proposed value',
      `Matrix,${matrix}`,
      `Organism,${organism}`,
      `Initial Pb concentration,${initialPb}`,
      `pH,${ph}`,
      `Temperature C,${temperature}`,
      `Duration days,${duration}`,
      `Microbial dosage,${dosage}`,
      'Status,Proposed experimental design only',
      'Note,Not a model prediction or validated optimum',
    ].join('\n')

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'lead_experimental_design.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const selected = mechanisms[selectedMechanism]

const filteredSoilRecords = useMemo(() => {
  const query = soilSearch.trim().toLowerCase()

  return soilCardRecords.filter(record => {
    const matchesLevel =
      !levelFilter || record.nutrient_level === levelFilter

    const matchesSearch =
      !query ||
      [
        record.district_name,
        record.block_name,
        record.village_name,
        record.nutrient_name,
        record.nutrient_type,
        record.nutrient_level,
        record.year,
      ].some(value =>
        String(value ?? '').toLowerCase().includes(query)
      )

    return matchesLevel && matchesSearch
  })
}, [soilCardRecords, levelFilter, soilSearch])

const soilTotalPages = Math.max(
  1,
  Math.ceil(filteredSoilRecords.length / SOIL_PAGE_SIZE)
)

const paginatedSoilRecords = filteredSoilRecords.slice(
  (soilPage - 1) * SOIL_PAGE_SIZE,
  soilPage * SOIL_PAGE_SIZE
)

const nutrientLevelChart = useMemo(() => {
  const counts: Record<string, number> = {}

  soilCardRecords.forEach(record => {
    const level = record.nutrient_level || 'Not reported'
    counts[level] = (counts[level] || 0) + 1
  })

  return Object.entries(counts).map(([level, count]) => ({
    level,
    count,
  }))
}, [soilCardRecords])

const districtChart = useMemo(() => {
  return (soilCardSummary?.districts ?? []).map(item => ({
    district: item.name,
    records: item.records,
  }))
}, [soilCardSummary])

  return (
    <div className="ai-workspace">
      <style>{styles}</style>

      <div className="ai-header">
        <div className="ai-heading">
          <h2>
            <BrainCircuit size={25} style={{ verticalAlign: 'middle', marginRight: 9 }} />
            Lead Research Intelligence Workspace
          </h2>
          <p>
            Evidence retrieval, microbial mechanisms, experimental analysis,
            soil health and predictive research planning.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          <span className="ai-live">
            <span className="ai-live-dot" />
            Research API
          </span>
          <button className="ai-button" onClick={() => void loadAIData()} disabled={refreshing}>
            <RefreshCw size={14} />
            {refreshing ? 'Refreshing...' : 'Refresh data'}
          </button>
        </div>
      </div>

      <div className="ai-tabs">
        {tabs.map((tab, index) => {
          const icons = [
  <BookOpen size={13} />,
  <Dna size={13} />,
  <FlaskConical size={13} />,
  <Sprout size={13} />,
  <ShieldCheck size={13} />,
  <TrendingUp size={13} />,
  <FileSearch size={13} />,
]

          return (
            <button
              key={tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {icons[index]} {' '}{tab}
            </button>
          )
        })}
      </div>

      {dataError && (
        <div className="ai-notice">
          <AlertTriangle size={15} style={{ verticalAlign: 'middle', marginRight: 7 }} />
          {dataError}
        </div>
      )}

      {activeTab === 'Pb Soil Assessment' && pbLoading && (
        <div className="ai-empty" role="status">
          Loading Pb assessment records...
        </div>
      )}

      {activeTab === 'Pb Soil Assessment' && pbError && (
        <div className="ai-notice" role="alert">
          <AlertTriangle size={15} style={{ verticalAlign: 'middle', marginRight: 7 }} />
          {pbError}
        </div>
      )}
      {activeTab === 'Pb Soil Assessment' && !pbLoading && !pbError && (
        <section className="pb-assessment">
          <div className="pb-heading">
            <div>
              <h2>Pb Soil Assessment</h2>
              <p>
                Record and compare soil-quality measurements before and after
                microbial treatment.
              </p>
            </div>

            <button
              className="ai-button"
              onClick={() => void loadPbAssessmentRecords()}
              disabled={pbLoading}
            >
              <RefreshCw size={14} />
              Refresh records
            </button>
          </div>

          <div className="pb-form">
            <h3>Sample information</h3>

            <div className="pb-form-grid">
              <label>
                Experiment ID *
                <input
                  value={pbExperimentId}
                  onChange={e => setPbExperimentId(e.target.value)}
                  placeholder="e.g. PB-EXP-001"
                />
              </label>

              <label>
                Sample ID *
                <input
                  value={pbSampleId}
                  onChange={e => setPbSampleId(e.target.value)}
                  placeholder="e.g. SAMPLE-001"
                />
              </label>

              <label>
                Sampling stage
                <select
                  value={pbSamplingStage}
                  onChange={e =>
                    setPbSamplingStage(e.target.value as PbSamplingStage)
                  }
                >
                  <option value="initial">Initial</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="final">Final</option>
                  <option value="control">Control</option>
                </select>
              </label>

              <label>
                Sample date
                <input
                  type="date"
                  value={pbSampleDate}
                  onChange={e => setPbSampleDate(e.target.value)}
                />
              </label>

              <label>
                District
                <input
                  value={pbDistrict}
                  onChange={e => setPbDistrict(e.target.value)}
                />
              </label>

              <label>
                Location
                <input
                  value={pbLocation}
                  onChange={e => setPbLocation(e.target.value)}
                  placeholder="Village / site"
                />
              </label>

              <label>
                Treatment
                <input
                  value={pbTreatment}
                  onChange={e => setPbTreatment(e.target.value)}
                  placeholder="e.g. Bacillus treatment"
                />
              </label>

              <label>
                Replicate
                <input
                  value={pbReplicate}
                  onChange={e => setPbReplicate(e.target.value)}
                  placeholder="e.g. R1"
                />
              </label>

              <label>
                Soil depth (cm)
                <input
                  type="number"
                  min="0"
                  value={pbSoilDepth}
                  onChange={e => setPbSoilDepth(e.target.value)}
                />
              </label>
            </div>

            <h3>Soil measurements</h3>

            <p className="pb-description">
              Enter measured values and their units. Leave unavailable
              measurements blank.
            </p>

            <div className="pb-table-wrap">
              <table className="pb-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Measured value</th>
                    <th>Unit</th>
                    <th>Analytical method</th>
                  </tr>
                </thead>

                <tbody>
                  {pbMeasurementFields.map(item => (
                    <tr key={item.field}>
                      <td>{item.label}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={pbMeasurements[item.field] ?? ''}
                          onChange={e =>
                            setPbMeasurements(previous => ({
                              ...previous,
                              [item.field]: e.target.value,
                            }))
                          }
                          placeholder="Enter value"
                        />
                      </td>
                      <td>
                        <input
                          value={pbUnits[item.field] ?? ''}
                          onChange={e =>
                            setPbUnits(previous => ({
                              ...previous,
                              [item.field]: e.target.value,
                            }))
                          }
                          placeholder="Unit"
                        />
                      </td>
                      <td>
                        <input
                          value={pbMethods[item.field] ?? ''}
                          onChange={e =>
                            setPbMethods(previous => ({
                              ...previous,
                              [item.field]: e.target.value,
                            }))
                          }
                          placeholder="Method"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="pb-notes">
              Notes
              <textarea
                value={pbNotes}
                onChange={e => setPbNotes(e.target.value)}
                placeholder="Add experimental observations, sampling details or other notes..."
                rows={3}
              />
            </label>

            <button
              className="ai-button primary"
              onClick={() => void handleSavePbAssessment()}
              disabled={pbSaving}
            >
              <Save size={14} />
              {pbSaving ? 'Saving...' : 'Save assessment'}
            </button>

            {pbSuccess && (
              <div className="ai-notice" role="status">{pbSuccess}</div>
            )}
          </div>

          <div className="pb-records">
            <h3>Recorded soil assessments</h3>

            {!pbRecords?.records?.length ? (
              <div className="ai-empty">
                No Pb soil assessment records are available yet.
              </div>
            ) : (
              <div className="pb-table-wrap">
                <table className="pb-table">
                  <thead>
                    <tr>
                      <th>Experiment</th>
                      <th>Sample</th>
                      <th>Stage</th>
                      <th>Treatment</th>
                      <th>Date</th>
                      <th>Measurements</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pbRecords.records.map((record, index) => (
                      <tr key={`${record.experiment_id}-${record.sample_id}-${index}`}>
                        <td>{displayValue(record.experiment_id)}</td>
                        <td>{displayValue(record.sample_id)}</td>
                        <td>{displayValue(record.sampling_stage)}</td>
                        <td>{displayValue(record.treatment)}</td>
                        <td>{displayValue(record.sample_date)}</td>
                        <td>
                          {record.measurements &&
                          typeof record.measurements === 'object' &&
                          !Array.isArray(record.measurements)
                            ? Object.entries(record.measurements as Record<string, unknown>)
                                .map(([key, value]) => `${key}: ${displayValue(value)}`)
                                .join(' | ')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pb-form">
            <h3>Compare treatment measurements</h3>
            <p className="pb-description">
              Compare recorded measurements within one experiment. Interpret total,
              extractable and leachable Pb as separate endpoints.
            </p>
            <div className="pb-form-grid">
              <label>
                Experiment ID
                <input
                  value={pbCompareExperiment}
                  onChange={event => setPbCompareExperiment(event.target.value)}
                  placeholder="Enter experiment ID"
                />
              </label>
              <label>
                Treatment (optional)
                <input
                  value={pbCompareTreatment}
                  onChange={event => setPbCompareTreatment(event.target.value)}
                  placeholder="Leave blank to compare all treatments"
                />
              </label>
            </div>
            <button
              className="ai-button primary"
              onClick={() => void handleComparePbTreatment()}
              disabled={pbComparing}
            >
              {pbComparing ? 'Comparing...' : 'Compare treatments'}
            </button>
            {pbComparisonError && (
              <div className="ai-notice" role="alert">{pbComparisonError}</div>
            )}
            {pbComparison && (
              <pre className="ai-chat-message answer" style={{ overflowX: 'auto' }}>
                {JSON.stringify(pbComparison, null, 2)}
              </pre>
            )}
          </div>
        </section>
      )}

      {/* 1. STUDY EVIDENCE */}
      {activeTab === 'Study Evidence' && (
        <>
          <div className="ai-grid">
            <div className="ai-card">
              <div className="ai-card-label"><Database size={15} /> Literature records</div>
              <div className="ai-card-value">{insights?.summary.literature_records ?? '—'}</div>
              <div className="ai-card-note">Records in the current research dataset</div>
            </div>
            <div className="ai-card">
              <div className="ai-card-label"><Microscope size={15} /> Organism entries</div>
              <div className="ai-card-value">{microbes?.total_organisms ?? '—'}</div>
              <div className="ai-card-note">Organism entries returned by the backend</div>
            </div>
            <div className="ai-card">
              <div className="ai-card-label"><BarChart3 size={15} /> Numeric records</div>
              <div className="ai-card-value">{observed?.total_numeric_records ?? '—'}</div>
              <div className="ai-card-note">Records with numeric concentration differences</div>
            </div>
            <div className="ai-card">
              <div className="ai-card-label"><ShieldCheck size={15} /> Model readiness</div>
              <div className="ai-card-value" style={{ fontSize: 19 }}>
                {readiness ? readiness.ready ? 'Ready' : 'Insufficient' : '—'}
              </div>
              <div className="ai-card-note">Current backend readiness assessment</div>
            </div>
          </div>

          <div className="ai-two-col">
            <section className="ai-panel">
              <h3><BrainCircuit size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} /> AI Research Assistant</h3>
              <p className="ai-panel-description">
                Ask questions about Pb bioremediation, organisms, experimental conditions and mechanisms.
              </p>

              <div className="ai-chat">
                <div className="ai-chat-form">
                  <input
                    className="ai-input"
                    value={question}
                    onChange={event => setQuestion(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') void sendQuestion()
                    }}
                    placeholder="e.g. Which microorganisms are associated with lead biosorption?"
                  />
                  <button className="ai-button primary" onClick={() => void sendQuestion()} disabled={loading || !question.trim()}>
                    <Send size={14} />
                    {loading ? 'Searching...' : 'Ask AI'}
                  </button>
                </div>

                {error && <div className="ai-notice">{error}</div>}

                {chat.length === 0 && (
                  <div className="ai-empty">Your questions and research responses will appear here.</div>
                )}

                {chat.map((item, index) => (
                  <div key={`${item.question}-${index}`}>
                    <div className="ai-chat-message question">
                      <b>Your question</b><br />{item.question}
                    </div>
                    <div className="ai-chat-message answer">
                      <b>Research response</b><br />{item.answer}
                      <p className="ai-muted">Evidence matches: {item.evidence_count}</p>
                      {item.disclaimer && <p className="ai-muted">{item.disclaimer}</p>}
                      {item.matches?.slice(0, 6).map((match, matchIndex) => (
                        <div className="ai-evidence" key={`${index}-${matchIndex}`}>
                          <h4>Evidence {matchIndex + 1} <span className="ai-pill">{match.type}</span></h4>
                          {Object.entries(match.record).slice(0, 9).map(([key, value]) => (
                            <p key={key}><b>{key}:</b> {readable(value)}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="ai-panel">
              <h3><FileSearch size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} /> Research insights</h3>
              <p className="ai-panel-description">Findings returned by the existing backend insights endpoint.</p>
              <input
                className="ai-input"
                value={evidenceSearch}
                onChange={event => setEvidenceSearch(event.target.value)}
                placeholder="Search research insights..."
              />
              <div className="ai-list" style={{ marginTop: 12 }}>
                {filteredInsights.length ? filteredInsights.map((item, index) => (
                  <div className="ai-evidence" key={`${item.topic}-${index}`}>
                    <h4>{item.topic}</h4>
                    <p>{item.finding}</p>
                  </div>
                )) : <div className="ai-empty">No matching insights available.</div>}
              </div>
            </section>
          </div>

          <section className="ai-panel">
            <h3>Evidence interpretation</h3>
            <p className="ai-panel-description">
              Separate reported findings from evidence quality and experimental endpoints.
            </p>
            <div className="ai-three-col">
              <div className="ai-evidence">
                <h4>Primary study evidence</h4>
                <p>Use original experimental papers to confirm organisms, methods, concentrations and outcomes.</p>
              </div>
              <div className="ai-evidence">
                <h4>Secondary evidence</h4>
                <p>Reviews are useful for background and research context but should not be treated as independent experimental measurements.</p>
              </div>
              <div className="ai-evidence">
                <h4>Endpoint comparability</h4>
                <p>Solution removal, extractable soil Pb reduction and total soil Pb removal are different endpoints.</p>
              </div>
            </div>
          </section>
        </>
      )}
      

      {/* 2. MECHANISMS */}
      {activeTab === 'Mechanisms' && (
        <>
          <section className="ai-panel">
            <h3><Dna size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} /> Microbial mechanism explorer</h3>
            <p className="ai-panel-description">
              Select a mechanism to explore its biological basis, measurements and interpretation limits.
            </p>

            <div className="ai-tabs">
              {mechanisms.map((item, index) => (
                <button
                  key={item.name}
                  className={selectedMechanism === index ? 'active' : ''}
                  onClick={() => setSelectedMechanism(index)}
                >
                  {item.name}
                </button>
              ))}
            </div>

            <div className="ai-evidence" style={{ marginTop: 14 }}>
              <span className="ai-pill">Mechanism {selectedMechanism + 1}</span>
              <h3 style={{ marginTop: 12 }}>{selected.name}</h3>
              <p className="ai-muted">{selected.description}</p>
              <div className="ai-success" style={{ marginTop: 12 }}>
                <b>What should be measured?</b>
                <p>{selected.measurements}</p>
              </div>
              <div className="ai-notice" style={{ marginTop: 12 }}>
                <b>Interpretation limit</b>
                <p>{selected.limitation}</p>
              </div>
            </div>
          </section>

          <div className="ai-two-col">
            <section className="ai-panel">
              <h3>Microorganism distribution</h3>
              <p className="ai-panel-description">
                Top organisms by literature record count. Frequency is not proof of effectiveness.
              </p>
              {microorganismChart.length ? (
                <div className="ai-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={microorganismChart} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#405348" />
                      <XAxis type="number" stroke="#9aac9f" fontSize={10} />
                      <YAxis type="category" dataKey="name" width={125} stroke="#9aac9f" fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="records" name="Literature records" fill="#55a987" radius={[0, 5, 5, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="ai-empty">No organism distribution data available.</div>}
            </section>

            <section className="ai-panel">
              <h3>Organism and method records</h3>
              <p className="ai-panel-description">Organisms and methods represented in the current dataset.</p>
              {microbes?.records.length ? (
                <div className="ai-list">
                  {microbes.records.map((item, index) => (
                    <div className="ai-evidence" key={`${item.organism}-${index}`}>
                      <h4>{item.organism}</h4>
                      <p>Records: {item.record_count}</p>
                      <p>Methods: {item.methods.join(', ') || 'Not reported'}</p>
                      <p>Sources: {item.contamination_sources.join(', ') || 'Not reported'}</p>
                    </div>
                  ))}
                </div>
              ) : <div className="ai-empty">No microorganism records loaded.</div>}
            </section>
          </div>

          <div className="ai-notice">
            Pb is an element. Microorganisms cannot biodegrade or destroy lead.
            They may bind, accumulate, transform its chemical form, precipitate it
            or reduce its mobility and bioavailability.
          </div>
        </>
      )}

      {/* 3. EXPERIMENTAL CONDITIONS */}
      {activeTab === 'Experimental Conditions' && (
        <>
          <section className="ai-panel">
            <h3><FlaskConical size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} /> Experimental condition planner</h3>
            <p className="ai-panel-description">
              Enter proposed experimental parameters. This tool creates a plan, not a prediction of remediation efficiency.
            </p>

            <div className="ai-form-grid">
              <div className="ai-field">
                <label className="ai-label">Experimental matrix</label>
                <select className="ai-select" value={matrix} onChange={event => { setMatrix(event.target.value); setDesignCreated(false) }}>
                  <option value="Soil">Contaminated soil</option>
                  <option value="Pb solution">Lead solution</option>
                  <option value="Wastewater">Wastewater</option>
                </select>
              </div>
              <div className="ai-field">
                <label className="ai-label">Microorganism / treatment</label>
                <input className="ai-input" value={organism} onChange={event => { setOrganism(event.target.value); setDesignCreated(false) }} />
              </div>
              <div className="ai-field">
                <label className="ai-label">Initial Pb concentration</label>
                <input className="ai-input" type="number" min="0.01" value={initialPb} onChange={event => { setInitialPb(event.target.value); setDesignCreated(false) }} />
                <span className="ai-muted">{matrix === 'Soil' ? 'mg/kg' : 'mg/L'} — keep units consistent</span>
              </div>
              <div className="ai-field">
                <label className="ai-label">pH (1–14)</label>
                <input className="ai-input" type="number" min="1" max="14" step="0.1" value={ph} onChange={event => { setPh(event.target.value); setDesignCreated(false) }} />
              </div>
              <div className="ai-field">
                <label className="ai-label">Temperature (°C)</label>
                <input className="ai-input" type="number" min="10" max="45" value={temperature} onChange={event => { setTemperature(event.target.value); setDesignCreated(false) }} />
              </div>
              <div className="ai-field">
                <label className="ai-label">Treatment duration (days)</label>
                <input className="ai-input" type="number" min="1" max="365" value={duration} onChange={event => { setDuration(event.target.value); setDesignCreated(false) }} />
              </div>
              <div className="ai-field">
                <label className="ai-label">Microbial dosage</label>
                <input className="ai-input" type="number" min="0.01" step="0.1" value={dosage} onChange={event => { setDosage(event.target.value); setDesignCreated(false) }} />
                <span className="ai-muted">Specify g/L or g/kg in your protocol</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 18 }}>
              <button className="ai-button primary" onClick={createExperimentalDesign}>
                <Beaker size={14} /> Generate experiment plan
              </button>
              <button className="ai-button" onClick={() => {
                setMatrix('Soil')
                setInitialPb('500')
                setPh('6.5')
                setTemperature('30')
                setDuration('30')
                setDosage('1')
                setOrganism('Bacterial isolate')
                setDesignCreated(false)
              }}>
                Reset
              </button>
            </div>
          </section>

          {designCreated && (
            <section className="ai-panel">
              <h3>Proposed experimental design</h3>
              <p className="ai-panel-description">Planning output — not an evidence-derived optimum.</p>
              <div className="ai-grid">
                {[
                  ['Matrix', matrix],
                  ['Treatment', organism],
                  ['Initial Pb', `${initialPb} ${matrix === 'Soil' ? 'mg/kg' : 'mg/L'}`],
                  ['pH', ph],
                  ['Temperature', `${temperature} °C`],
                  ['Duration', `${duration} days`],
                  ['Dosage', dosage],
                ].map(([label, value]) => (
                  <div className="ai-card" key={label}>
                    <div className="ai-card-label">{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 10 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div className="ai-success" style={{ marginTop: 14 }}>
                <b>Recommended controls and measurements</b>
                <ul style={{ paddingLeft: 19, lineHeight: 1.8 }}>
                  <li>Untreated contaminated matrix control.</li>
                  <li>Abiotic control without active microbial treatment.</li>
                  <li>Biological replicates and a defined sampling schedule.</li>
                  <li>Initial and final Pb using a validated analytical method.</li>
                  <li>Total Pb separately from extractable Pb and leachability.</li>
                  <li>pH, microbial viability and relevant soil-health indicators.</li>
                </ul>
              </div>
              <div className="ai-notice" style={{ marginTop: 12 }}>
                Do not compare mg/L solution measurements directly with mg/kg soil measurements.
              </div>
              <button className="ai-button primary" onClick={exportDesign} style={{ marginTop: 14 }}>
                Export experiment plan CSV
              </button>
            </section>
          )}

          <section className="ai-panel">
            <h3>Suggested experimental workflow</h3>
            <div className="ai-three-col">
              {[
                ['01 · Baseline', 'Characterize the contaminated matrix and measure initial Pb.'],
                ['02 · Treatment', 'Apply the selected microbial treatment under defined conditions.'],
                ['03 · Validation', 'Measure endpoints, compare controls and calculate mass balance.'],
              ].map(([heading, detail]) => (
                <div className="ai-evidence" key={heading}>
                  <h4>{heading}</h4><p>{detail}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      
{/* 4. SOIL HEALTH */}
{activeTab === 'Soil Health' && (
  <>
    <section className="ai-panel">
      <div className="ai-section-title">
        <h3>
          <Sprout size={17} style={{ verticalAlign: 'middle', marginRight: 7 }} />
          Telangana Soil Health Card Dataset
        </h3>
        <button
          className="ai-button"
          onClick={() => {
            setDistrictFilter('')
            setBlockFilter('')
            setVillageFilter('')
            setNutrientFilter('')
            setNutrientTypeFilter('')
            setLevelFilter('')
            setSoilSearch('')
            setSoilPage(1)
          }}
        >
          <RefreshCw size={13} /> Reset filters
        </button>
      </div>

      <p className="ai-panel-description">
        Explore reported soil nutrient records across the districts represented
        in the Telangana Soil Health Card dataset.
      </p>

      {soilCardError && (
        <div className="ai-notice" style={{ marginBottom: 14 }}>
          <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {soilCardError}
        </div>
      )}

      {soilCardLoading && (
        <div className="ai-empty">Loading Soil Health Card data...</div>
      )}

      {soilCardSummary && (
        <>
          <div className="ai-grid" style={{ marginTop: 15 }}>
            <div className="ai-card">
              <div className="ai-card-label">
                <Database size={14} /> Total records
              </div>
              <div className="ai-card-value">
                {soilCardSummary.total_records.toLocaleString()}
              </div>
              <div className="ai-card-note">Dataset records</div>
            </div>

            <div className="ai-card">
              <div className="ai-card-label">
                <Target size={14} /> Districts
              </div>
              <div className="ai-card-value">
                {soilCardSummary.total_districts}
              </div>
              <div className="ai-card-note">Districts represented</div>
            </div>

            <div className="ai-card">
              <div className="ai-card-label">
                <Sprout size={14} /> Blocks
              </div>
              <div className="ai-card-value">
                {soilCardSummary.total_blocks}
              </div>
              <div className="ai-card-note">Blocks represented</div>
            </div>

            <div className="ai-card">
              <BookOpen size={14} /> Villages
              <div className="ai-card-value">
                {soilCardSummary.total_villages}
              </div>
              <div className="ai-card-note">Villages represented</div>
            </div>
          </div>

          <div className="ai-notice" style={{ marginTop: 14 }}>
            <b>Dataset information</b>
            <p>
              State: {soilCardSummary.state} · Reporting year:{' '}
              {soilCardSummary.reporting_years.join(', ')}
            </p>
            <p>
              Dataset: {soilCardSummary.dataset}
            </p>
            <p>
              Value definition: {soilCardSummary.value_definition}
            </p>
          </div>
        </>
      )}
    </section>

    {/* DISTRICT DISTRIBUTION */}
    <section className="ai-panel">
      <h3>District-wise dataset distribution</h3>
      <p className="ai-panel-description">
        Number of records available for each district. These are dataset
        record counts, not independent soil sample counts.
      </p>

      {districtChart.length > 0 ? (
        <div className="ai-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={districtChart}
              margin={{ top: 10, right: 20, left: 5, bottom: 45 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#d0d0d0" />
              <XAxis
                dataKey="district"
                angle={-20}
                textAnchor="end"
                interval={0}
                height={65}
                fontSize={9}
              />
              <YAxis fontSize={10} />
              <Tooltip />
              <Bar
                dataKey="records"
                name="Dataset records"
                fill="#333333"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="ai-empty">District distribution is unavailable.</div>
      )}
    </section>

    {/* FILTERS */}
    <section className="ai-panel">
      <h3>Explore soil nutrient records</h3>
      <p className="ai-panel-description">
        Select the geographic area and nutrient category to retrieve matching records.
      </p>

      <div className="ai-form-grid">
        <div className="ai-field">
          <label className="ai-label">District</label>
          <select
            className="ai-select"
            value={districtFilter}
            onChange={event => {
              setDistrictFilter(event.target.value)
              setBlockFilter('')
              setVillageFilter('')
              setSoilPage(1)
            }}
          >
            <option value="">All districts</option>
            {(soilCardFilters?.districts ?? []).map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="ai-field">
          <label className="ai-label">Block</label>
          <select
            className="ai-select"
            value={blockFilter}
            onChange={event => {
              setBlockFilter(event.target.value)
              setVillageFilter('')
              setSoilPage(1)
            }}
          >
            <option value="">All blocks</option>
            {(soilCardFilters?.blocks ?? []).map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="ai-field">
          <label className="ai-label">Village</label>
          <select
            className="ai-select"
            value={villageFilter}
            onChange={event => {
              setVillageFilter(event.target.value)
              setSoilPage(1)
            }}
          >
            <option value="">All villages</option>
            {(soilCardFilters?.villages ?? []).map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="ai-field">
          <label className="ai-label">Nutrient</label>
          <select
            className="ai-select"
            value={nutrientFilter}
            onChange={event => {
              setNutrientFilter(event.target.value)
              setSoilPage(1)
            }}
          >
            <option value="">All nutrients</option>
            {(soilCardFilters?.nutrient_names ?? []).map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="ai-field">
          <label className="ai-label">Nutrient type</label>
          <select
            className="ai-select"
            value={nutrientTypeFilter}
            onChange={event => {
              setNutrientTypeFilter(event.target.value)
              setSoilPage(1)
            }}
          >
            <option value="">All nutrient types</option>
            {(soilCardFilters?.nutrient_types ?? []).map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="ai-field">
          <label className="ai-label">Nutrient level</label>
          <select
            className="ai-select"
            value={levelFilter}
            onChange={event => {
              setLevelFilter(event.target.value)
              setSoilPage(1)
            }}
          >
            <option value="">All levels</option>
            {(soilCardFilters?.nutrient_levels ?? []).map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="ai-label">Search records</label>
        <input
          className="ai-input"
          value={soilSearch}
          onChange={event => {
            setSoilSearch(event.target.value)
            setSoilPage(1)
          }}
          placeholder="Search district, block, village or nutrient..."
        />
      </div>
    </section>

    {/* NUTRIENT LEVEL CHART */}
    <section className="ai-panel">
      <h3>Nutrient-level distribution</h3>
      <p className="ai-panel-description">
        Distribution of the currently retrieved records by their reported
        nutrient-level category.
      </p>

      {nutrientLevelChart.length > 0 ? (
        <div className="ai-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={nutrientLevelChart}
              margin={{ top: 10, right: 20, left: 5, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#d0d0d0" />
              <XAxis dataKey="level" fontSize={10} />
              <YAxis allowDecimals={false} fontSize={10} />
              <Tooltip />
              <Bar
                dataKey="count"
                name="Records"
                fill="#555555"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="ai-empty">
          Nutrient-level distribution will appear when records are available.
        </div>
      )}
    </section>

    {/* RECORDS TABLE */}
    <section className="ai-panel">
      <div className="ai-section-title">
        <h3>Soil Health Card records</h3>
        <span className="ai-pill">
          {filteredSoilRecords.length.toLocaleString()} matching records
        </span>
      </div>

      <p className="ai-panel-description">
        Source-reported values and categories. The value column is not assigned
        a unit unless the source metadata confirms one.
      </p>

      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{
          width: '100%',
          minWidth: 850,
          borderCollapse: 'collapse',
          fontSize: 11,
        }}>
          <thead>
            <tr>
              {[
                'Year',
                'District',
                'Block',
                'Village',
                'Nutrient',
                'Type',
                'Level',
                'Source-reported value',
              ].map(heading => (
                <th
                  key={heading}
                  style={{
                    border: '1px solid #000',
                    padding: 10,
                    textAlign: 'left',
                    background: '#fff',
                    color: '#000',
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paginatedSoilRecords.map(record => (
              <tr key={record._id}>
                {[
                  record.year,
                  record.district_name,
                  record.block_name,
                  record.village_name,
                  record.nutrient_name,
                  record.nutrient_type,
                  record.nutrient_level,
                  readable(record.value),
                ].map((value, index) => (
                  <td
                    key={`${record._id}-${index}`}
                    style={{
                      border: '1px solid #000',
                      padding: 9,
                      background: '#fff',
                      color: '#000',
                    }}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}

            {paginatedSoilRecords.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    border: '1px solid #000',
                    padding: 18,
                    textAlign: 'center',
                    background: '#fff',
                    color: '#000',
                  }}
                >
                  {soilCardLoading
                    ? 'Loading records...'
                    : 'No records match the selected filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginTop: 15,
        }}
      >
        <span className="ai-muted">
          Page {soilPage} of {soilTotalPages}
        </span>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="ai-button"
            disabled={soilPage <= 1}
            onClick={() => setSoilPage(page => Math.max(1, page - 1))}
          >
            Previous
          </button>
          <button
            className="ai-button"
            disabled={soilPage >= soilTotalPages}
            onClick={() =>
              setSoilPage(page => Math.min(soilTotalPages, page + 1))
            }
          >
            Next
          </button>
        </div>
      </div>
    </section>

    {/* EXISTING LEAD SOIL HEALTH ASSESSMENT */}
    <section className="ai-panel">
      <h3>
        <ShieldCheck size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} />
        Lead-contaminated soil health assessment
      </h3>
      <p className="ai-panel-description">
        Separate Pb assessment returned by your existing research backend.
      </p>

      {soil ? (
        <>
          <span className={`ai-pill ${soil.ready ? '' : 'warning'}`}>
            {soil.ready ? 'Assessment data available' : 'Additional measurements needed'}
          </span>
          <p className="ai-muted" style={{ marginTop: 12 }}>{soil.message}</p>

          <div className="ai-three-col">
            {soil.required_measurements.map((measurement, index) => (
              <div className="ai-evidence" key={`${measurement}-${index}`}>
                <h4>Measurement {index + 1}</h4>
                <p>{measurement}</p>
              </div>
            ))}
          </div>

          <div className="ai-success" style={{ marginTop: 13 }}>
            <b>Recommendation</b>
            <p>{soil.recommendation}</p>
          </div>
        </>
      ) : (
        <div className="ai-empty">
          Lead soil-health assessment information unavailable.
        </div>
      )}

      <div className="ai-three-col" style={{ marginTop: 15 }}>
        <div className="ai-evidence">
          <h4>Total lead concentration</h4>
          <p>Measures overall Pb burden in soil. A decrease requires evidence of net Pb removal.</p>
        </div>
        <div className="ai-evidence">
          <h4>Available and extractable Pb</h4>
          <p>Indicates potentially mobile or accessible Pb fractions, depending on the extraction method.</p>
        </div>
        <div className="ai-evidence">
          <h4>Leachability</h4>
          <p>Assesses the potential for Pb to move into water under a defined leaching protocol.</p>
        </div>
        <div className="ai-evidence">
          <h4>Soil pH</h4>
          <p>Influences metal speciation, sorption, precipitation and mobility.</p>
        </div>
        <div className="ai-evidence">
          <h4>Microbial activity</h4>
          <p>Can be assessed using suitable microbial biomass, viability or activity measurements.</p>
        </div>
        <div className="ai-evidence">
          <h4>Soil biological function</h4>
          <p>Consider plant growth, enzyme activity and other indicators suitable for the study.</p>
        </div>
      </div>

      <div className="ai-notice" style={{ marginTop: 14 }}>
        The Soil Health Card dataset does not contain Pb concentration or
        microbiome measurements. Do not use its nutrient values as lead
        bioremediation training data. A reduction in extractable Pb or
        leachability is not equivalent to a reduction in total soil Pb.
      </div>
    </section>
        {/* PUBLISHED LEAD CONCENTRATION RESEARCH */}
    <section className="ai-panel">
      <div className="ai-section-title">
        <h3>
          <FlaskConical
            size={17}
            style={{ verticalAlign: 'middle', marginRight: 7 }}
          />
          Lead (Pb) concentration research records
        </h3>

        <span className="ai-pill">
          {leadRecords.length} research records
        </span>
      </div>

      <p className="ai-panel-description">
        Published experimental measurements of lead bioremediation.
        These records are separate from the official Telangana Soil Health
        Card dataset and should not be interpreted as statewide measurements.
      </p>

      {leadError && (
        <div className="ai-notice" style={{ marginBottom: 14 }}>
          <AlertTriangle
            size={14}
            style={{ verticalAlign: 'middle', marginRight: 6 }}
          />
          {leadError}
        </div>
      )}

      {leadLoading ? (
        <div className="ai-empty">
          Loading published Pb research records...
        </div>
      ) : (
        <>
          <div className="ai-grid" style={{ marginTop: 15 }}>
            <div className="ai-card">
              <div className="ai-card-label">
                <Database size={14} /> Total records
              </div>
              <div className="ai-card-value">
                {leadRecords.length}
              </div>
              <div className="ai-card-note">
                Retrieved research records
              </div>
            </div>

            <div className="ai-card">
              <div className="ai-card-label">
                <Sprout size={14} /> Microorganisms
              </div>
              <div className="ai-card-value">
                {new Set(
                  leadRecords.map(record => record.Microorganism)
                ).size}
              </div>
              <div className="ai-card-note">
                Distinct reported names
              </div>
            </div>

            <div className="ai-card">
              <div className="ai-card-label">
                <Target size={14} /> Soil types
              </div>
              <div className="ai-card-value">
                {new Set(
                  leadRecords.map(record => record['Soil Type'])
                ).size}
              </div>
              <div className="ai-card-note">
                Reported soil categories
              </div>
            </div>

            <div className="ai-card">
              <div className="ai-card-label">
                <ShieldCheck size={14} /> Verified records
              </div>
              <div className="ai-card-value">
                {
                  leadRecords.filter(record =>
                    record['Verification Status']
                      ?.toLowerCase()
                      .includes('verified')
                  ).length
                }
              </div>
              <div className="ai-card-note">
                Status marked as verified
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="ai-label">
              Search published Pb records
            </label>
            <input
              className="ai-input"
              value={leadSearch}
              onChange={event => setLeadSearch(event.target.value)}
              placeholder="Search microorganism, soil type, source or DOI..."
            />
          </div>

          <div style={{ overflowX: 'auto', marginTop: 14 }}>
            <table
              style={{
                width: '100%',
                minWidth: 1250,
                borderCollapse: 'collapse',
                fontSize: 11,
              }}
            >
              <thead>
                <tr>
                  {[
                    'Microorganism',
                    'Mechanism',
                    'Soil type',
                    'Contamination source',
                    'Initial Pb',
                    'Final Pb',
                    'Units',
                    'pH',
                    'Temperature',
                    'Duration',
                    'Removal efficiency',
                    'DOI / Reference',
                    'Verification',
                  ].map(heading => (
                    <th
                      key={heading}
                      style={{
                        border: '1px solid #000',
                        padding: 9,
                        textAlign: 'left',
                        background: '#fff',
                        color: '#000',
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {leadRecords
                  .filter(record => {
                    const search = leadSearch.toLowerCase().trim()

                    if (!search) return true

                    return [
                      record.Microorganism,
                      record['Bioremediation Mechanism'],
                      record['Soil Type'],
                      record['Lead Contamination Source'],
                      record['Primary-Paper DOI / Reference'],
                      record['Verification Status'],
                    ].some(value =>
                      String(value ?? '')
                        .toLowerCase()
                        .includes(search)
                    )
                  })
                  .map((record, index) => (
                    <tr
                      key={`${record.Microorganism}-${index}`}
                    >
                      {[
                        record.Microorganism,
                        record['Bioremediation Mechanism'],
                        record['Soil Type'],
                        record['Lead Contamination Source'],
                        record['Initial Pb Concentration'],
                        record['Final Pb Concentration'],
                        record['Concentration Units'],
                        record.pH,
                        record['Temperature (°C)'] ??
                          record['Temperature (Â°C)'] ??
                          'Not reported',
                        record['Treatment Duration'],
                        record['Removal Efficiency (%)'],
                        record['Primary-Paper DOI / Reference'],
                        record['Verification Status'],
                      ].map((value, cellIndex) => (
                        <td
                          key={`${index}-${cellIndex}`}
                          style={{
                            border: '1px solid #000',
                            padding: 9,
                            background: '#fff',
                            color: '#000',
                            maxWidth: 220,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {value ?? 'Not reported'}
                        </td>
                      ))}
                    </tr>
                  ))}

                {leadRecords.filter(record => {
                  const search = leadSearch.toLowerCase().trim()

                  return !search || [
                    record.Microorganism,
                    record['Bioremediation Mechanism'],
                    record['Soil Type'],
                    record['Lead Contamination Source'],
                    record['Primary-Paper DOI / Reference'],
                    record['Verification Status'],
                  ].some(value =>
                    String(value ?? '')
                      .toLowerCase()
                      .includes(search)
                  )
                }).length === 0 && (
                  <tr>
                    <td
                      colSpan={13}
                      style={{
                        border: '1px solid #000',
                        padding: 18,
                        textAlign: 'center',
                        background: '#fff',
                        color: '#000',
                      }}
                    >
                      {leadRecords.length === 0
                        ? 'No published Pb research records are available.'
                        : 'No records match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="ai-notice" style={{ marginTop: 14 }}>
            <b>Scientific interpretation:</b>
            <p>
              Initial and final concentrations must be compared only when
              their units, sample matrices and analytical endpoints are
              compatible. A decrease in extractable Pb does not necessarily
              demonstrate a decrease in total soil Pb.
            </p>
            <p>
              These published experimental records do not establish
              district-wise Pb contamination in Telangana.
            </p>
          </div>
        </>
      )}
    </section>
  </>
)}


      {/* 5. PREDICTION MODELS */}
      {activeTab === 'Prediction Models' && (
        <>
          <div className="ai-grid">
            <div className="ai-card">
              <div className="ai-card-label"><Database size={15} /> Total records</div>
              <div className="ai-card-value">{readiness?.total_records ?? '—'}</div>
              <div className="ai-card-note">Records assessed by the backend</div>
            </div>
            <div className="ai-card">
              <div className="ai-card-label"><BarChart3 size={15} /> Numeric records</div>
              <div className="ai-card-value">{readiness?.numeric_records ?? '—'}</div>
              <div className="ai-card-note">Records with numeric values</div>
            </div>
            <div className="ai-card">
              <div className="ai-card-label"><ShieldCheck size={15} /> Verified records</div>
              <div className="ai-card-value">{readiness?.verified_records ?? '—'}</div>
              <div className="ai-card-note">Backend verification count</div>
            </div>
            <div className="ai-card">
              <div className="ai-card-label"><Target size={15} /> Readiness</div>
              <div className="ai-card-value" style={{ fontSize: 19 }}>
                {readiness ? readiness.ready ? 'Ready' : 'Insufficient' : '—'}
              </div>
              <div className="ai-card-note">Current model-readiness assessment</div>
            </div>
          </div>

          <section className="ai-panel">
            <h3><TrendingUp size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} /> Prediction model readiness</h3>
            <p className="ai-panel-description">Backend assessment of whether the current data supports predictive modelling.</p>
            {readiness ? (
              <>
                <span className={`ai-pill ${readiness.ready ? '' : 'warning'}`}>
                  {readiness.ready ? 'Readiness criteria met' : 'More data required'}
                </span>
                <p className="ai-muted" style={{ marginTop: 12 }}>{readiness.message}</p>
                {readiness.recommendation && (
                  <div className="ai-success" style={{ marginTop: 12 }}>
                    <b>Recommendation</b><p>{readiness.recommendation}</p>
                  </div>
                )}
                {readiness.unit_distribution && (
                  <div style={{ marginTop: 14 }}>
                    <h4>Measurement unit distribution</h4>
                    {Object.entries(readiness.unit_distribution).map(([unit, count]) => (
                      <div className="ai-list-item" key={unit}>
                        <span>{unit}</span><b>{count}</b>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : <div className="ai-empty">Prediction readiness data unavailable.</div>}
          </section>

          <section className="ai-panel">
            <h3>Observed concentration differences</h3>
            <p className="ai-panel-description">
              Descriptive summaries grouped by measurement unit. These are not future forecasts.
            </p>
            {observedChart.length ? (
              <>
                <div className="ai-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={observedChart} margin={{ top: 10, right: 20, left: 5, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#405348" />
                      <XAxis dataKey="unit" stroke="#9aac9f" fontSize={10} />
                      <YAxis stroke="#9aac9f" fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="mean" name="Mean observed difference (%)" fill="#65aa8a" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="ai-list">
                  {observedChart.map((group, index) => (
                    <div className="ai-list-item" key={`${group.unit}-${index}`}>
                      <span>{group.unit}</span>
                      <span>Mean: {group.mean}% · Records: {group.records}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="ai-empty">No numeric observed-difference groups available.</div>}
            {observed?.interpretation && (
              <div className="ai-success" style={{ marginTop: 12 }}>{observed.interpretation}</div>
            )}
          </section>

          <section className="ai-panel">
            <h3>Recommended model-development workflow</h3>
            <div className="ai-three-col">
              <div className="ai-evidence">
                <h4>1. Data validation</h4>
                <p>Verify original sources, units, matrix type, organism identity, endpoints and experimental metadata.</p>
              </div>
              <div className="ai-evidence">
                <h4>2. Model training</h4>
                <p>Use comparable measured observations and avoid mixing incompatible soil and solution measurements.</p>
              </div>
              <div className="ai-evidence">
                <h4>3. Independent validation</h4>
                <p>Use study-level train/test separation, suitable error metrics and uncertainty intervals.</p>
              </div>
            </div>
          </section>

          <div className="ai-notice">
            A 10-year forecast of soil Pb requires suitable longitudinal measurements, comparable endpoints
            and external validation. Literature counts or unrelated concentration pairs cannot establish
            how much lead will be removed in the future.
          </div>
        </>
      )}

      {/* 6. RESEARCH GAPS */}
      {activeTab === 'Research Gaps' && (
        <>
          <section className="ai-panel">
            <h3><Search size={16} style={{ verticalAlign: 'middle', marginRight: 7 }} /> Research gaps and future directions</h3>
            <p className="ai-panel-description">
              These gaps are based on the evidence and data limitations relevant to this project.
              They are not claims that no research exists worldwide.
            </p>

            <div className="ai-two-col">
              {researchGaps.map((gap, index) => (
                <div className="ai-gap" key={gap.title}>
                  <span className="ai-pill">Gap {String(index + 1).padStart(2, '0')}</span>
                  <h4 style={{ marginTop: 10 }}>{gap.title}</h4>
                  <small>Priority: {gap.priority}</small>
                  <p>{gap.description}</p>
                  <div className="ai-success">
                    <b>Proposed research</b>
                    <p>{gap.experiment}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="ai-panel">
            <h3>Suggested M.Sc. research direction</h3>
            <p className="ai-panel-description">A possible project combining microbiology, analytical chemistry and data science.</p>
            <h3 style={{ fontSize: 17, lineHeight: 1.5 }}>
              Development and evaluation of a compatible microbial consortium for lead immobilization in contaminated soil, with assessment of long-term stability.
            </h3>
            <div className="ai-three-col" style={{ marginTop: 14 }}>
              <div className="ai-evidence">
                <h4>Microbial screening</h4>
                <p>Screen individual isolates for Pb tolerance, growth and binding characteristics.</p>
              </div>
              <div className="ai-evidence">
                <h4>Consortium development</h4>
                <p>Assess microbial compatibility and compare selected consortia with individual strains.</p>
              </div>
              <div className="ai-evidence">
                <h4>Long-term assessment</h4>
                <p>Measure total Pb, available Pb and leachability under defined environmental stress.</p>
              </div>
            </div>
            <div className="ai-notice" style={{ marginTop: 14 }}>
              Lead is toxic. Follow institutional risk assessments, PPE, containment, labelled waste collection
              and authorized hazardous-waste disposal. Do not release Pb-loaded cultures or treated material
              into the environment.
            </div>
          </section>
        </>
      )}

      <div className="ai-footer">
        Lead Research Explorer · AI-assisted evidence retrieval ·
        Predictions require verified, comparable experimental data.
      </div>
    </div>
  )
}

export default AIWorkspace
