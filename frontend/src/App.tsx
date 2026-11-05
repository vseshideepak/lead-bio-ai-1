
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import type { TabName } from './AIWorkspace'
// @ts-expect-error The JavaScript component does not currently have a declaration file.
import InSilicoLeadSimulator from './components/InSilicoLeadSimulator'

import {
  Activity,
  Atom,
  BarChart3,
  BookOpen,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Database,
  FlaskConical,
  LayoutDashboard,
  Leaf,
  Microscope,
  Search,
  ShieldCheck,
} from 'lucide-react'

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
  getHealth,
  getDatabaseStatus,
  getResearchSummary,
  getOrganismRecords,
  getConcentrationRecords,
} from './services/api'

import type {
  HealthStatus,
  DatabaseStatus,
  ResearchSummary,
  OrganismRecord,
  ConcentrationRecord,
} from './services/api'

import './App.css'

// Load large workspaces only when the user opens them.
const AIWorkspace = lazy(() =>
  import('./AIWorkspace'),
)
const SoilMonitoring = lazy(() => import('./SoilMonitoring'))

const navigation = [
  { name: 'Overview', icon: LayoutDashboard, group: 'WORKSPACE' },
  { name: 'Study Evidence', icon: BookOpen, group: 'WORKSPACE' },
  { name: 'Microorganisms', icon: Microscope, group: 'WORKSPACE' },
  { name: 'Mechanisms', icon: Atom, group: 'WORKSPACE' },
  {
    name: 'Experimental Conditions',
    icon: FlaskConical,
    group: 'WORKSPACE',
  },
  { name: 'Soil Monitoring', icon: Activity, group: 'MONITORING' },
  { name: 'Soil Health', icon: Leaf, group: 'MONITORING' },
  { name: 'Prediction Models', icon: BrainCircuit, group: 'ANALYTICS' },
  { name: 'Research Gaps', icon: BarChart3, group: 'ANALYTICS' },
  { name: 'AI Research', icon: BrainCircuit, group: 'ANALYTICS' },
  {
  name: 'In-Silico Lead Simulator',
  icon: FlaskConical,
  group: 'ANALYTICS',
},
]

const PAGE_SIZE = 10

function App() {
  const [active, setActive] = useState('Overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [database, setDatabase] = useState<DatabaseStatus | null>(null)
  const [summary, setSummary] = useState<ResearchSummary | null>(null)

  const [organisms, setOrganisms] = useState<OrganismRecord[]>([])
  const [concentrations, setConcentrations] = useState<ConcentrationRecord[]>([])

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [organismSearch, setOrganismSearch] = useState('')
  const [sortColumn, setSortColumn] =
    useState<keyof OrganismRecord>('Organism')
  const [sortDirection, setSortDirection] =
    useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  

  // ------------------------------------------------------------
  // Load research data
  // ------------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [healthData, databaseData, summaryData, organismData, concentrationData] =
        await Promise.all([
          getHealth(),
          getDatabaseStatus(),
          getResearchSummary(),
          getOrganismRecords(),
          getConcentrationRecords(),
        ])

      setHealth(healthData)
      setDatabase(databaseData)
      setSummary(summaryData)
      setOrganisms(organismData.records)
      setConcentrations(concentrationData.records)
    } catch (err) {
      console.error('Research API error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load research data. Check that the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // ------------------------------------------------------------
  // Database calculations
  // ------------------------------------------------------------

  const totalRows = database?.tables
    ? Object.values(database.tables).reduce(
        (sum, item) => sum + item.rows,
        0
      )
    : 0

  const organismCounts = useMemo(() => {
    return organisms.reduce<Record<string, number>>((counts, record) => {
      const name = record.Organism?.trim() || 'Not specified'
      counts[name] = (counts[name] || 0) + 1
      return counts
    }, {})
  }, [organisms])

  const organismChartData = useMemo(() => {
    return Object.entries(organismCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [organismCounts])

  const mechanismChartData = useMemo(() => {
    return summary
      ? Object.entries(summary.remediation_methods)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
      : []
  }, [summary])

  const unitCounts = summary?.concentration_units || {}

  // ------------------------------------------------------------
  // Microorganism search, sorting and pagination
  // ------------------------------------------------------------

  const filteredOrganisms = useMemo(() => {
    const query = organismSearch.trim().toLowerCase()

    return organisms.filter((record) =>
      [
        record.Organism,
        record.Remediation_Method,
        record.Contamination_Source,
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      )
    )
  }, [organisms, organismSearch])

  const sortedFilteredOrganisms = useMemo(() => {
    return [...filteredOrganisms].sort((a, b) => {
      const first = a[sortColumn]
      const second = b[sortColumn]

      let comparison = 0

      if (typeof first === 'number' && typeof second === 'number') {
        comparison = first - second
      } else {
        comparison = String(first ?? '').localeCompare(
          String(second ?? ''),
          undefined,
          { numeric: true, sensitivity: 'base' }
        )
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredOrganisms, sortColumn, sortDirection])

  const totalPages = Math.max(
    1,
    Math.ceil(sortedFilteredOrganisms.length / PAGE_SIZE)
  )

  const safePage = Math.min(currentPage, totalPages)

  const paginatedOrganisms = sortedFilteredOrganisms.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  const firstRecord =
    sortedFilteredOrganisms.length === 0
      ? 0
      : (safePage - 1) * PAGE_SIZE + 1

  const lastRecord = Math.min(
    safePage * PAGE_SIZE,
    sortedFilteredOrganisms.length
  )

  function sortOrganisms(column: keyof OrganismRecord) {
    if (sortColumn === column) {
      setSortDirection((direction) =>
        direction === 'asc' ? 'desc' : 'asc'
      )
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }

    setCurrentPage(1)
  }

  function changePage(page: number) {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }

  // ------------------------------------------------------------
  // Page content
  // ------------------------------------------------------------

  const isAIWorkspacePage = [
    'Study Evidence',
    'Mechanisms',
    'Experimental Conditions',
    'Soil Health',
    'Prediction Models',
    'Research Gaps',
    'AI Research',
  ].includes(active)

  const pageDescriptions: Record<string, string> = {
    Overview:
      'An evidence-driven workspace for studying lead bioremediation, microbial mechanisms and soil-health outcomes.',
    'Study Evidence':
      'Explore literature records, experimental observations and supporting research evidence.',
    Microorganisms:
      'Explore microorganisms and their reported lead bioremediation methods.',
    Mechanisms:
      'Examine microbial interactions and the processes involved in lead immobilization and transformation.',
    'Experimental Conditions':
      'Review experimental variables, treatment conditions and measurement requirements.',
    'Soil Monitoring':
      'Track soil measurements, laboratory results and historical monitoring records.',
    'Soil Health':
      'Explore soil-health indicators and the available district-level evidence.',
    'Prediction Models':
      'Examine model readiness, prediction methods and scientific validation requirements.',
    'Research Gaps':
      'Identify limitations in the existing evidence and opportunities for future investigation.',
    'AI Research':
      'Use AI-assisted tools to explore and interpret your research datasets.',
      'In-Silico Lead Simulator':
  'Explore scenario-based lead immobilization, soil partitioning and long-term soil-health modelling.',
  }

  return (
    <div
      className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
    >
      {/* -------------------------------------------------- */}
      {/* SIDEBAR */}
      {/* -------------------------------------------------- */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">Pb</div>

          <div className="brand-copy">
            <h2>Lead Research</h2>
            <span>RESEARCH EXPLORER</span>
          </div>

          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={
              sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
            }
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={17} />
            ) : (
              <ChevronLeft size={17} />
            )}
          </button>
        </div>

        <div className="sidebar-navigation">
          {['WORKSPACE', 'MONITORING', 'ANALYTICS'].map((group) => (
            <div className="navigation-group" key={group}>
              <div className="nav-label">{group}</div>

              <nav className="navigation">
                {navigation
                  .filter((item) => item.group === group)
                  .map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      className={
                        active === name
                          ? 'nav-item active'
                          : 'nav-item'
                      }
                      onClick={() => setActive(name)}
                      title={sidebarCollapsed ? name : undefined}
                      aria-current={active === name ? 'page' : undefined}
                    >
                      <Icon size={18} strokeWidth={1.9} />
                      <span>{name}</span>
                    </button>
                  ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span
              className={
                database?.connected
                  ? 'status-dot'
                  : 'status-dot offline'
              }
            />

            <div className="sidebar-status-copy">
              <b>Research environment</b>
              <small>
                {database?.connected
                  ? 'Database available'
                  : 'Database status unavailable'}
              </small>
            </div>
          </div>

          <div className="sidebar-version">
            <ShieldCheck size={14} />
            <span>Evidence-first research platform</span>
          </div>
        </div>
      </aside>

      {/* -------------------------------------------------- */}
      {/* MAIN AREA */}
      {/* -------------------------------------------------- */}

      <main className="main-area">
        {/* TOPBAR */}

        <header className="topbar">
          <div className="breadcrumb">
            <span>Research Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <b>{active}</b>
          </div>

          <div className="topbar-right">
            <button
              className="refresh-button"
              onClick={() => void loadData()}
              disabled={loading}
              title="Refresh research data"
            >
              <Activity size={15} />
              <span>{loading ? 'Refreshing...' : 'Refresh data'}</span>
            </button>

            <div className="connection">
              <span
                className={
                  health?.status === 'healthy'
                    ? 'status-dot'
                    : 'status-dot offline'
                }
              />
              <span>
                {health?.status === 'healthy'
                  ? 'API Connected'
                  : loading
                    ? 'Connecting'
                    : 'API Unavailable'}
              </span>
            </div>

            <div className="avatar" title="Research workspace">
              Pb
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}

        <div className="dashboard-content">
          {/* PAGE INTRODUCTION */}

          <section className="welcome">
            <div>
              <div className="eyebrow">
                MICROBIOLOGY <span>·</span> RESEARCH ANALYTICS
              </div>

              <h1>
                {active === 'Overview'
                  ? 'Lead Research Explorer'
                  : active}
              </h1>

              <p>{pageDescriptions[active]}</p>
            </div>

            <div className="welcome-icon">
              <Microscope size={34} strokeWidth={1.6} />
            </div>
          </section>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          {loading && (
            <div className="panel loading-panel">
              <div className="loading-indicator" />
              <span>Loading research datasets from the backend...</span>
            </div>
          )}

          {/* ================================================== */}
          {/* OVERVIEW PAGE                                      */}
          {/* ================================================== */}

          {active === 'Overview' && (
            <>
              <section className="section-title">
                <div>
                  <h2>Research overview</h2>
                  <p>
                    Live information from your research files and SQLite
                    database.
                  </p>
                </div>

                <span className="date-label">LIVE DATA</span>
              </section>

              {/* KPI CARDS */}

              <section className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-top">
                    <span>Literature records</span>
                    <div className="metric-icon green">
                      <BookOpen size={19} />
                    </div>
                  </div>

                  <strong>
                    {summary?.literature_records ?? '—'}
                  </strong>

                  <small>Records loaded from research CSV</small>
                </div>

                <div className="metric-card">
                  <div className="metric-top">
                    <span>Concentration records</span>
                    <div className="metric-icon blue">
                      <FlaskConical size={19} />
                    </div>
                  </div>

                  <strong>
                    {summary?.concentration_records ?? '—'}
                  </strong>

                  <small>Records loaded from research Excel</small>
                </div>

                <div className="metric-card">
                  <div className="metric-top">
                    <span>Microorganisms</span>
                    <div className="metric-icon purple">
                      <Microscope size={19} />
                    </div>
                  </div>

                  <strong>
                    {Object.keys(organismCounts).length || '—'}
                  </strong>

                  <small>
                    Distinct organism labels in the literature file
                  </small>
                </div>

                <div className="metric-card">
                  <div className="metric-top">
                    <span>API status</span>
                    <div className="metric-icon orange">
                      <Activity size={19} />
                    </div>
                  </div>

                  <strong className="status-text">
                    {health?.status === 'healthy' ? 'Online' : '—'}
                  </strong>

                  <small>
                    {health?.message || 'Waiting for backend response'}
                  </small>
                </div>
              </section>

              {/* ORGANISM CHART + DATABASE */}

              <section className="content-grid">
                <div className="panel chart-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Microorganism distribution</h3>
                      <p>
                        Top organism labels in the literature dataset
                      </p>
                    </div>

                    <span className="panel-tag">
                      {organisms.length ? 'CSV DATA' : 'NO DATA'}
                    </span>
                  </div>

                  <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={organismChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e5ebf1"
                        />

                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          height={65}
                        />

                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10 }}
                        />

                        <Tooltip />

                        <Bar
                          dataKey="value"
                          name="Literature records"
                          fill="#138b83"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-note">
                    Counts represent organism labels in the loaded dataset,
                    not validated effectiveness rankings.
                  </div>
                </div>

                <div className="panel database-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Database overview</h3>
                      <p>Existing SQLite database</p>
                    </div>

                    <Database size={20} />
                  </div>

                  {database?.tables ? (
                    <>
                      {Object.entries(database.tables).map(
                        ([name, info]) => (
                          <div className="table-row" key={name}>
                            <span>{name}</span>
                            <b>{info.rows} rows</b>
                          </div>
                        )
                      )}

                      <div className="table-row total-row">
                        <span>Total SQLite rows</span>
                        <b>{totalRows}</b>
                      </div>
                    </>
                  ) : (
                    <p className="empty-message">
                      Loading database information...
                    </p>
                  )}

                  <div className="database-footer">
                    <span
                      className={
                        database?.connected
                          ? 'status-dot'
                          : 'status-dot offline'
                      }
                    />

                    {database?.connected
                      ? 'SQLite connected'
                      : 'Database unavailable'}
                  </div>

                  <div className="chart-note">
                    SQLite application tables are separate from the CSV
                    and Excel research datasets.
                  </div>
                </div>
              </section>

              {/* REMEDIATION METHODS + CONCENTRATION DATA */}

              <section className="content-grid">
                <div className="panel chart-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Remediation methods</h3>
                      <p>
                        Frequency of method labels in the literature CSV
                      </p>
                    </div>

                    <span className="panel-tag">
                      DATASET SUMMARY
                    </span>
                  </div>

                  <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mechanismChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e5ebf1"
                        />

                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          height={75}
                        />

                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10 }}
                        />

                        <Tooltip />

                        <Bar
                          dataKey="value"
                          name="Records"
                          fill="#537fa6"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="chart-note">
                    These are recorded remediation-method categories,
                    not experimentally comparable performance measurements.
                  </div>
                </div>

                <div className="panel database-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Concentration dataset</h3>
                      <p>Experimental record overview</p>
                    </div>

                    <FlaskConical size={20} />
                  </div>

                  <div className="table-row">
                    <span>Total loaded records</span>
                    <b>{concentrations.length}</b>
                  </div>

                  {Object.entries(unitCounts).map(([unit, count]) => (
                    <div className="table-row" key={unit}>
                      <span>{unit}</span>
                      <b>{count} records</b>
                    </div>
                  ))}

                  <div className="chart-note">
                    mg/L and mg/kg measurements must remain separate.
                    They represent different sample matrices and cannot
                    be combined into one soil-concentration comparison.
                  </div>
                </div>
              </section>

              {/* RESEARCH WORKFLOW */}

              <section className="section-title lower-title">
                <div>
                  <h2>Research workflow</h2>
                  <p>
                    Explore the main stages of your research project.
                  </p>
                </div>
              </section>

              <section className="workflow-grid">
                <div className="workflow-card">
                  <div className="workflow-icon">
                    <BookOpen />
                  </div>

                  <span>01 · EVIDENCE</span>
                  <h3>Literature database</h3>

                  <p>
                    Organize studies, DOIs, organisms, matrices and
                    experimental findings.
                  </p>
                </div>

                <div className="workflow-card">
                  <div className="workflow-icon">
                    <Microscope />
                  </div>

                  <span>02 · MICROBIOLOGY</span>
                  <h3>Microbial analysis</h3>

                  <p>
                    Explore microorganisms and their reported
                    lead-remediation mechanisms.
                  </p>
                </div>

                <div className="workflow-card">
                  <div className="workflow-icon">
                    <FlaskConical />
                  </div>

                  <span>03 · EXPERIMENTS</span>
                  <h3>Condition analysis</h3>

                  <p>
                    Study pH, temperature, treatment time, dosage
                    and experimental design.
                  </p>
                </div>

                <div className="workflow-card">
                  <div className="workflow-icon">
                    <BrainCircuit />
                  </div>

                  <span>04 · MODELLING</span>
                  <h3>Predictive analysis</h3>

                  <p>
                    Build and validate endpoint-specific models
                    when sufficient data exist.
                  </p>
                </div>
              </section>

              {/* SCIENTIFIC NOTE */}

              <div className="science-note">
                <ShieldCheck size={19} />

                <div>
                  <b>Scientific interpretation matters</b>

                  <p>
                    Lead cannot be biodegraded or destroyed.
                    Microorganisms may bind, accumulate, immobilize
                    or precipitate lead. Total Pb removal and reduced
                    Pb mobility must be measured and reported separately.
                    Dataset records and DOI references still require
                    independent primary-source verification before
                    scientific modelling.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ================================================== */}
          {/* MICROORGANISMS PAGE                                */}
          {/* ================================================== */}

          {active === 'Microorganisms' && (
            <section className="section">
              <div className="section-title">
                <div>
                  <h2>Microorganism database</h2>
                  <p>
                    Explore organisms and their reported lead
                    bioremediation methods.
                  </p>
                </div>

                <span className="date-label">
                  {organisms.length} RECORDS
                </span>
              </div>

              <div className="panel organism-panel">
                <div className="table-toolbar">
                  <div className="table-search">
                    <Search size={17} />

                    <input
                      type="search"
                      placeholder="Search organism, method or contamination source..."
                      value={organismSearch}
                      onChange={(event) => {
                        setOrganismSearch(event.target.value)
                        setCurrentPage(1)
                      }}
                      aria-label="Search microorganism records"
                    />
                  </div>

                  <span className="subtext">
                    Showing {firstRecord}–{lastRecord} of{' '}
                    {filteredOrganisms.length} matching records
                  </span>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        {[
                          ['Organism', 'Organism'],
                          ['Remediation_Method', 'Remediation method'],
                          ['Contamination_Source', 'Contamination source'],
                          ['Efficacy_Percent', 'Efficacy (%)'],
                          ['pH', 'pH'],
                          ['Temp_C', 'Temperature (°C)'],
                        ].map(([column, label]) => (
                          <th key={column}>
                            <button
                              className="sort-button"
                              onClick={() =>
                                sortOrganisms(
                                  column as keyof OrganismRecord
                                )
                              }
                            >
                              {label}

                              {sortColumn === column && (
                                <span>
                                  {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                                </span>
                              )}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedOrganisms.map((record, index) => (
                        <tr key={record.Organism + '-' + index}>
                          <td>
                            <strong>
                              {record.Organism || 'Not specified'}
                            </strong>
                          </td>

                          <td>
                            {record.Remediation_Method || 'Not specified'}
                          </td>

                          <td>
                            {record.Contamination_Source || 'Not specified'}
                          </td>

                          <td>{record.Efficacy_Percent ?? 'N/A'}</td>
                          <td>{record.pH ?? 'N/A'}</td>
                          <td>{record.Temp_C ?? 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredOrganisms.length === 0 && (
                    <div className="empty-state">
                      <Microscope size={28} />
                      <strong>No matching microorganisms found</strong>
                      <p>Try another organism or search term.</p>
                    </div>
                  )}
                </div>

                {filteredOrganisms.length > 0 && (
                  <div className="table-pagination">
                    <span>
                      Page {safePage} of {totalPages}
                    </span>

                    <div className="pagination-actions">
                      <button
                        onClick={() => changePage(safePage - 1)}
                        disabled={safePage <= 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={17} />
                        Previous
                      </button>

                      <button
                        onClick={() => changePage(safePage + 1)}
                        disabled={safePage >= totalPages}
                        aria-label="Next page"
                      >
                        Next
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="science-note">
                <ShieldCheck size={19} />

                <div>
                  <b>Interpreting microorganism records</b>
                  <p>
                    Reported efficacy values depend on experimental
                    conditions, lead concentration, sample matrix and
                    measurement endpoint. They should not be treated
                    as directly comparable organism rankings without
                    validation.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ================================================== */}
          {/* SOIL MONITORING PAGE                               */}
          {/* ================================================== */}

          {active === 'Soil Monitoring' && (
            <Suspense
              fallback={
                <div className="panel loading-panel">
                  Loading soil monitoring workspace...
                </div>
              }
            >
              <SoilMonitoring />
            </Suspense>
          )}

          {active === 'Prediction Models' && (
            <section className="section">
              <InSilicoLeadSimulator />
            </section>
          )}
{/* ================================================== */}
{/* IN-SILICO LEAD SIMULATOR                            */}
{/* ================================================== */}

{active === 'In-Silico Lead Simulator' && (
  <section className="section">
    <InSilicoLeadSimulator />
  </section>
)}
          {/* ================================================== */}
          {/* AI RESEARCH WORKSPACE                              */}
          {/* ================================================== */}

          {isAIWorkspacePage && (
            <Suspense
              fallback={
                <div className="panel loading-panel">
                  Loading research analysis workspace...
                </div>
              }
            >
              <AIWorkspace
                key={active}
                {...(active !== 'AI Research'
                  ? { initialTab: active as TabName }
                  : {})}
              />
            </Suspense>
          )}

          {/* FOOTER */}

          <footer className="footer">
            Lead Research Explorer · Local research environment ·
            Evidence-first analysis
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
