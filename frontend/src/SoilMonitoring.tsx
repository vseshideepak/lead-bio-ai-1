import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import {
  getMonitoringStatus,
  getDistrictMonitoringSummary,
  getDistrictMonitoringHistory,
  submitSoilReading,
  getTelanganaDistricts,
  getTelanganaDistrict,
  getTelanganaSoilSurveys,
} from './services/api'

import type {
  MonitoringStatus,
  SoilReading,
  TelanganaDistrict,
  SoilSurveyProject,
  SoilSurveyResponse,
} from './services/api'
const emptyForm = {
  moisture: '',
  ph: '',
  temperature: '',
  ec: '',
  lead_mg_kg: '',
  other_metals: '',
  microorganisms: '',
  mandal: '',
village: '',
latitude: '',
longitude: '',
  notes: '',
}

function SoilMonitoring() {
  const [status, setStatus] = useState<MonitoringStatus | null>(null)
  const [reading, setReading] = useState<SoilReading | null>(null)
  const [history, setHistory] = useState<SoilReading[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [districts, setDistricts] = useState<TelanganaDistrict[]>([])
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [districtLoading, setDistrictLoading] = useState(true)
  const [districtProfile, setDistrictProfile] =
    useState<TelanganaDistrict | null>(null)

  const [districtProfileLoading, setDistrictProfileLoading] =
    useState(false)

  const [districtProfileError, setDistrictProfileError] =
    useState('')

  const [districtReadingCount, setDistrictReadingCount] =
    useState(0)
  const [surveyProjects, setSurveyProjects] =
    useState<SoilSurveyProject[]>([])

  const [surveyLoading, setSurveyLoading] = useState(true)
  const [surveyError, setSurveyError] = useState('')

    
  useEffect(() => {
    getTelanganaDistricts()
      .then(data => {
        setDistricts(data.districts)

        if (data.districts.length > 0) {
          setSelectedDistrict(data.districts[0].id)
        }
      })
      .catch(err => {
        setError(
          err instanceof Error ? err.message : 'Unable to load districts'
        )
      })
      .finally(() => {
        setDistrictLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedDistrict) {
      setDistrictProfile(null)
      return
    }

    let cancelled = false

    setDistrictProfileLoading(true)
    setDistrictProfileError('')

    getTelanganaDistrict(selectedDistrict)
      .then(profile => {
        if (!cancelled) {
          setDistrictProfile(profile)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setDistrictProfile(null)
          setDistrictProfileError(
            err instanceof Error
              ? err.message
              : 'Unable to load district profile'
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDistrictProfileLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedDistrict])

  useEffect(() => {
  let cancelled = false

  getTelanganaSoilSurveys()
    .then((data: SoilSurveyResponse) => {
      if (!cancelled) {
        setSurveyProjects(data.projects)
      }
    })
    .catch(err => {
      if (!cancelled) {
        setSurveyError(
          err instanceof Error
            ? err.message
            : 'Unable to load soil survey projects'
        )
      }
    })
    .finally(() => {
      if (!cancelled) {
        setSurveyLoading(false)
      }
    })

  return () => {
    cancelled = true
  }
}, [])

  const refresh = useCallback(async () => {
    if (!selectedDistrict) return

    setLoading(true)

    try {
      const [statusData, districtData, historyData] = await Promise.all([
        getMonitoringStatus(),
        getDistrictMonitoringSummary(selectedDistrict),
        getDistrictMonitoringHistory(selectedDistrict, 100),
      ])

      setStatus(statusData)
      setReading(districtData.latest_reading)
      setHistory(historyData.records)
      setDistrictReadingCount(districtData.total_readings)
      setError('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load district monitoring data'
      )
    } finally {
      setLoading(false)
    }
  }, [selectedDistrict])

useEffect(() => {
  if (!selectedDistrict) return

  refresh()

  const timer = window.setInterval(refresh, 10 * 60 * 1000)
  return () => window.clearInterval(timer)
}, [refresh, selectedDistrict])

  const currentDistrict = districts.find(d => d.id === selectedDistrict)

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm(previous => ({ ...previous, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    const numeric = (value: string) =>
      value.trim() === '' ? null : Number(value)

    const payload: SoilReading = {
  source: 'manual',

  
  // Location information
district_id: selectedDistrict,
district_name: currentDistrict?.name ?? null,
mandal: form.mandal.trim() || null,
village: form.village.trim() || null,
latitude: numeric(form.latitude),
longitude: numeric(form.longitude),

  // Soil measurements
  moisture: numeric(form.moisture),
  ph: numeric(form.ph),
  temperature: numeric(form.temperature),
  ec: numeric(form.ec),
  lead_mg_kg: numeric(form.lead_mg_kg),
  other_metals: form.other_metals || null,
  microorganisms: form.microorganisms || null,
  notes: form.notes || null,
}
    try {
      await submitSoilReading(payload)
      setMessage('Reading saved successfully.')
      setForm(emptyForm)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save reading')
    } finally {
      setSaving(false)
    }
  }

  const metrics = [
    { label: 'Soil moisture', value: reading?.moisture, unit: '%' },
    { label: 'Soil pH', value: reading?.ph, unit: 'pH' },
    { label: 'Temperature', value: reading?.temperature, unit: '°C' },
    { label: 'Electrical conductivity', value: reading?.ec, unit: 'EC' },
    { label: 'Lead concentration', value: reading?.lead_mg_kg, unit: 'mg/kg' },
  ]

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleString() : 'Not recorded'

  return (
    <section className="section monitoring-page">
      <div className="section-title">
        <div>
          <h2>Soil Monitoring Dashboard</h2>
          <p>Track soil measurements, laboratory results and historical readings.</p>
        </div>
        <button className="btn" onClick={refresh}>Refresh now</button>
      </div>

      <div className="panel district-selector-panel">
  <h3>Telangana District Soil Intelligence</h3>

  <p>
    Select a district to inspect its soil profile and monitoring data.
  </p>

  <label htmlFor="district-select">
    Select district
  </label>

  <select
    id="district-select"
    value={selectedDistrict}
    onChange={e => setSelectedDistrict(e.target.value)}
    disabled={districtLoading}
  >
    {districtLoading ? (
      <option value="">Loading districts...</option>
    ) : (
      districts.map(district => (
        <option key={district.id} value={district.id}>
          {district.name}
        </option>
      ))
    )}
  </select>

  {districtProfileLoading && (
    <p>Loading district soil profile...</p>
  )}

  {districtProfileError && (
    <div className="error-message">
      {districtProfileError}
    </div>
  )}

  {(districtProfile || currentDistrict) && (
    <div className="monitoring-details">

      <h3>
        {(districtProfile || currentDistrict)?.name}
      </h3>

      <p>
        <strong>District ID:</strong>{' '}
        {(districtProfile || currentDistrict)?.id}
      </p>

      <p>
        <strong>Profile status:</strong>{' '}
        {(districtProfile || currentDistrict)
          ?.profile_status.replaceAll('_', ' ')}
      </p>

      <p>
        <strong>Verified soil types:</strong>{' '}
        {(districtProfile || currentDistrict)?.soil_types.length
          ? (districtProfile || currentDistrict)?.soil_types.join(', ')
          : 'Not yet verified'}
      </p>

      <p>
        <strong>Published soil profile:</strong>{' '}
        {(districtProfile || currentDistrict)?.data_available
          ? 'Available'
          : 'Not yet connected'}
      </p>

      <hr />

      <h4>District monitoring information</h4>

      <p>
        <strong>Total monitoring readings:</strong>{' '}
        {districtReadingCount}
      </p>

      <p>
        <strong>Latest recorded reading:</strong>{' '}
        {reading?.recorded_at
          ? new Date(reading.recorded_at).toLocaleString()
          : 'No measurements recorded'}
      </p>

      <p>
        <strong>Monitoring status:</strong>{' '}
        {districtReadingCount > 0
          ? 'Monitoring data available'
          : 'No measurements yet'}
      </p>

    </div>
  )}

  <small>
    {districts.length} districts registered in Telangana.
  </small>
</div>

      <div className="panel soil-surveys">
        <h3>Soil survey projects</h3>
        {surveyLoading ? (
          <p>Loading soil survey projects...</p>
        ) : surveyError ? (
          <div className="error-message">{surveyError}</div>
        ) : (
          <p>{surveyProjects.length} soil survey projects available.</p>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      <div className="panel soil-survey-panel">
  <h3>Telangana Soil Survey Coverage</h3>

  <p>
    Officially documented historical soil-mapping projects.
    Historical coverage does not necessarily represent verified
    current district soil profiles.
  </p>

  {surveyLoading && <p>Loading soil survey projects...</p>}

  {surveyError && (
    <div className="error-message">{surveyError}</div>
  )}

  {!surveyLoading && !surveyError && (
    <>
      <h4>Documented projects: {surveyProjects.length}</h4>

      <div className="survey-project-grid">
        {surveyProjects.map(project => (
          <div className="panel survey-project-card" key={project.id}>
            <h4>{project.title}</h4>

            <p><strong>Mapping scale:</strong> {project.scale}</p>

            <p>
              <strong>Base year:</strong>{' '}
              {project.base_year ?? 'Not specified'}
            </p>

            <p>
              <strong>Organisation:</strong>{' '}
              {project.source_organisation}
            </p>

            <p>
              <strong>Data type:</strong> {project.data_type}
            </p>

            <p><strong>Historical districts:</strong></p>

            <ul>
              {project.historical_districts.map(district => (
                <li key={district}>{district}</li>
              ))}
            </ul>

            <p>
              <strong>Verification:</strong>{' '}
              {project.verification_status.replaceAll('_', ' ')}
            </p>

            <p>
              <strong>Boundary alignment:</strong>{' '}
              {project.boundary_alignment.replaceAll('_', ' ')}
            </p>

            <a
              href={project.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View official project source ↗
            </a>
          </div>
        ))}
      </div>
    </>
  )}
</div>
      {message && <div className="panel">{message}</div>}

      <div className="panel monitoring-status">
        <div>
          <strong>
            {status?.database_connected ? 'Database connected' : 'Checking database'}
          </strong>
          <p>{status?.message || 'Loading monitoring status...'}</p>
        </div>
        <div>
          <strong>{status?.total_readings ?? 0}</strong>
          <small>Total stored readings</small>
        </div>
        <div>
          <strong>
            {status?.automatic_sensor_connection ? 'Connected' : 'Not connected'}
          </strong>
          <small>Automatic sensor connection</small>
        </div>
      </div>

      <div className="monitoring-heading">
        <h3>Latest soil measurements</h3>
        <span>Last recorded: {formatDate(reading?.recorded_at)}</span>
      </div>

      <div className="monitoring-metrics">
        {metrics.map(item => (
          <div className="panel monitoring-metric" key={item.label}>
            <small>{item.label}</small>
            <strong>
              {item.value === null || item.value === undefined
                ? '—'
                : `${item.value} ${item.unit}`}
            </strong>
            <span>{item.value === null || item.value === undefined
              ? 'No measurement recorded'
              : 'Latest stored value'}</span>
          </div>
        ))}
      </div>

      <div className="panel monitoring-details">
        <h3>Biological and chemical analysis</h3>
        <p><strong>Microorganisms:</strong> {reading?.microorganisms || 'Not recorded'}</p>
        <p><strong>Other metals:</strong> {reading?.other_metals || 'Not recorded'}</p>
        <p><strong>Notes:</strong> {reading?.notes || 'No additional notes'}</p>
        <p><strong>Data source:</strong> {reading?.source || 'No reading available'}</p>
      </div>

      <div className="panel monitoring-form-panel">
        <h3>Enter a soil reading</h3>
        <p className="monitoring-note">
          Enter actual measured values from your sensors or laboratory reports.
          These entries are stored as manual readings, not AI-generated measurements.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="monitoring-form-grid">

  <label>
    Mandal
    <input
      type="text"
      placeholder="Enter mandal"
      value={form.mandal}
      onChange={e => updateField('mandal', e.target.value)}
    />
  </label>

  <label>
    Village
    <input
      type="text"
      placeholder="Enter village"
      value={form.village}
      onChange={e => updateField('village', e.target.value)}
    />
  </label>

  <label>
    Latitude
    <input
      type="number"
      step="any"
      placeholder="e.g. 17.5000"
      value={form.latitude}
      onChange={e => updateField('latitude', e.target.value)}
    />
  </label>

  <label>
    Longitude
    <input
      type="number"
      step="any"
      placeholder="e.g. 78.5000"
      value={form.longitude}
      onChange={e => updateField('longitude', e.target.value)}
    />
  </label>

  <label>
    Soil moisture (%)
    <input
      type="number"
      min="0"
      max="100"
      step="any"
      value={form.moisture}
      onChange={e => updateField('moisture', e.target.value)}
    />
  </label>

  <label>
    Soil pH (0–14)
    <input
      type="number"
      min="0"
      max="14"
      step="any"
      value={form.ph}
      onChange={e => updateField('ph', e.target.value)}
    />
  </label>

  <label>
    Soil temperature (°C)
    <input
      type="number"
      step="any"
      value={form.temperature}
      onChange={e => updateField('temperature', e.target.value)}
    />
  </label>

  <label>
    Electrical conductivity (EC)
    <input
      type="number"
      min="0"
      step="any"
      value={form.ec}
      onChange={e => updateField('ec', e.target.value)}
    />
  </label>

  <label>
    Lead concentration (mg/kg)
    <input
      type="number"
      min="0"
      step="any"
      value={form.lead_mg_kg}
      onChange={e => updateField('lead_mg_kg', e.target.value)}
    />
  </label>

  <label>
    Other heavy metals
    <input
      type="text"
      placeholder="Cd, Cr, Ni..."
      value={form.other_metals}
      onChange={e => updateField('other_metals', e.target.value)}
    />
  </label>

  <label>
    Microorganisms
    <input
      type="text"
      placeholder="Enter laboratory identification"
      value={form.microorganisms}
      onChange={e => updateField('microorganisms', e.target.value)}
    />
  </label>

  <label>
    Notes
    <input
      type="text"
      placeholder="Sample ID, location, testing method..."
      value={form.notes}
      onChange={e => updateField('notes', e.target.value)}
    />
  </label>

</div>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save soil reading'}
          </button>
        </form>
      </div>

      <div className="panel monitoring-history">
        <h3>Reading history</h3>
        {loading ? (
          <p>Loading records...</p>
        ) : history.length === 0 ? (
          <p>No soil readings have been stored yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Moisture</th>
                  <th>pH</th>
                  <th>Temperature</th>
                  <th>EC</th>
                  <th>Lead (mg/kg)</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => (
                  <tr key={item.id ?? index}>
                    <td>{formatDate(item.recorded_at)}</td>
                    <td>{item.source}</td>
                    <td>{item.moisture ?? '—'}</td>
                    <td>{item.ph ?? '—'}</td>
                    <td>{item.temperature ?? '—'}</td>
                    <td>{item.ec ?? '—'}</td>
                    <td>{item.lead_mg_kg ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="monitoring-warning">
        <strong>Scientific limitation:</strong> Software cannot independently measure
        soil moisture, pH, lead concentration or microbial populations. Actual values
        require appropriate sensors, laboratory tests or connected analytical
        instruments. A 10-minute refresh retrieves stored backend data; it does not
        mean new sensor measurements are being collected.
      </div>
    </section>
  )
}

export default SoilMonitoring

