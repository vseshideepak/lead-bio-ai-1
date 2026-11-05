import React, { useEffect, useState } from "react";
import "../styles/InSilicoLeadSimulator.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const initialForm = {
  district: "Medchal-Malkajgiri",
  initial_total_pb_mg_kg: "250",
  initial_extractable_pb_mg_kg: "40",
  initial_leachable_pb_mg_kg: "",
  rate_constant_per_year: "0.05",
  horizon_years: "25",
  treatment: "Microbial immobilization scenario",
  soil_ph: "7",
  organic_carbon_percent: "0.8",
  clay_percent: "25",
  soil_temperature_c: "28",
  soil_moisture_percent: "20",
  kd_l_kg: "",
  soil_water_l_kg: "",
};

function Metric({ label, value, unit }) {
  return (
    <div className="ils-metric">
      <span>{label}</span>
      <strong>
        {value ?? "—"}
        {value !== null && value !== undefined ? ` ${unit || ""}` : ""}
      </strong>
    </div>
  );
}

export default function InSilicoLeadSimulator() {
  const [form, setForm] = useState(initialForm);
  const [districts, setDistricts] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/in-silico-lead-simulator/districts`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load districts.");
        return response.json();
      })
      .then((data) => setDistricts(data.districts || []))
      .catch(() => setError(
        "Backend not connected. Start the FastAPI server and refresh."
      ));
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function runModel(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const numericFields = [
      "initial_total_pb_mg_kg",
      "initial_extractable_pb_mg_kg",
      "rate_constant_per_year",
      "horizon_years",
    ];

    const payload = { ...form };

    for (const field of numericFields) {
      payload[field] = Number(form[field]);
    }

    const optionalNumericFields = [
      "initial_leachable_pb_mg_kg",
      "soil_ph",
      "organic_carbon_percent",
      "clay_percent",
      "soil_temperature_c",
      "soil_moisture_percent",
      "kd_l_kg",
      "soil_water_l_kg",
    ];

    for (const field of optionalNumericFields) {
      payload[field] =
        form[field] === "" ? null : Number(form[field]);
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/in-silico-lead-simulator/simulate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Simulation failed. Check your input values."
        );
      }

            setResult(data);

      console.log("SIMULATOR API RESPONSE:", data);
      console.log("SIMULATOR TRAJECTORY:", data.trajectory);

    } catch (error) {
      console.error("Simulation error:", error);

      const message =
        error.response?.data?.detail ||
        error.message ||
        "Unknown simulation error";

      setError(
        typeof message === "string"
          ? message
          : JSON.stringify(message)
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!result?.trajectory) return;

    const columns = [
      "year",
      "total_pb_mg_kg",
      "extractable_pb_mg_kg",
      "modelled_immobilized_pool_mg_kg",
      "leachable_pb_mg_kg",
    ];

    const rows = result.trajectory.map((item) =>
      columns.map((column) => item[column] ?? "").join(",")
    );

    const csv = [columns.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "lead_soil_25_year_scenario.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  const maximum = result?.trajectory?.length
  ? Math.max(
      1,
      ...result.trajectory.flatMap((item) => [
        Number(item.total_pb_mg_kg) || 0,
        Number(item.extractable_pb_mg_kg) || 0,
        Number(item.modelled_immobilized_pool_mg_kg) || 0,
      ])
    )
  : 1;

  return (
    <main className="ils-page">
      <header className="ils-header">
        <div>
          <p className="ils-eyebrow">LEAD RESEARCH EXPLORER</p>
          <h1>In-Silico Lead Soil Simulator</h1>
          <p>
            Explore 25-year lead-soil scenarios using measured inputs
            and transparent mathematical models.
          </p>
        </div>
        <div className="ils-horizon">
  {form.horizon_years} YEAR MODEL
</div>
      </header>

      <div className="ils-notice">
        <strong>Scientific model notice</strong>
        <p>
          This is a scenario simulator, not a validated field forecast.
          The kinetic rate is an input assumption. A reduction in the
          extractable pool is not proof of total lead removal.
        </p>
      </div>
      
      {/* SCIENTIFIC PROCESS DIAGRAM */}
      <section className="ils-panel">
        <h2>Microbial lead-remediation pathway</h2>
        <p className="ils-help">
          Conceptual overview of how microbial treatments may influence
          lead mobility in contaminated soil.
        </p>

        <div className="ils-process">
          <div className="ils-process-step">
            <div className="ils-process-number">01</div>
            <h3>Contaminated soil</h3>
            <p>
              Characterize total Pb, extractable Pb and leachable Pb
              using separate analytical measurements.
            </p>
          </div>

          <div className="ils-process-step">
            <div className="ils-process-number">02</div>
            <h3>Microbial interaction</h3>
            <p>
              Microorganisms may interact with Pb through biosorption,
              bioaccumulation, precipitation or other mechanisms.
            </p>
          </div>

          <div className="ils-process-step">
            <div className="ils-process-number">03</div>
            <h3>Pb immobilization</h3>
            <p>
              Treatment may alter Pb speciation and mobility.
              The actual effect requires experimental measurement.
            </p>
          </div>

          <div className="ils-process-step">
            <div className="ils-process-number">04</div>
            <h3>Soil-health monitoring</h3>
            <p>
              Assess pH, organic carbon, microbial biomass,
              enzyme activity and relevant soil properties.
            </p>
          </div>
        </div>

        <div className="ils-diagram-note">
          <strong>Scientific distinction:</strong> Lead is an element
          and cannot be biodegraded. Microbial processes may bind,
          accumulate, precipitate or immobilize it. These processes
          do not necessarily reduce total Pb concentration.
        </div>
      </section>


      <form className="ils-form" onSubmit={runModel}>
        <section className="ils-panel">
          <h2>1. Location and treatment</h2>

          <div className="ils-grid">
            <label>
              Telangana district
              <select
                name="district"
                value={form.district}
                onChange={updateField}
              >
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Treatment scenario
              <select
                name="treatment"
                value={form.treatment}
                onChange={updateField}
              >
                <option>Microbial immobilization scenario</option>
                <option>Biochar-assisted immobilization scenario</option>
                <option>Combined microbial and biochar scenario</option>
                <option>Untreated baseline scenario</option>
                <option>Custom treatment scenario</option>
              </select>
            </label>
          </div>
          <p className="ils-help">
            Treatment labels organize scenarios. They do not automatically
            change the model rate constant.
          </p>
        </section>

        <section className="ils-panel">
          <h2>2. Initial lead measurements</h2>

          <div className="ils-grid">
            <label>
              Total Pb (mg/kg dry soil)
              <input
                type="number"
                min="0"
                step="any"
                name="initial_total_pb_mg_kg"
                value={form.initial_total_pb_mg_kg}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Extractable Pb (mg/kg dry soil)
              <input
                type="number"
                min="0"
                step="any"
                name="initial_extractable_pb_mg_kg"
                value={form.initial_extractable_pb_mg_kg}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Leachable Pb (mg/kg dry soil, optional)
              <input
                type="number"
                min="0"
                step="any"
                name="initial_leachable_pb_mg_kg"
                value={form.initial_leachable_pb_mg_kg}
                onChange={updateField}
                placeholder="Enter measured value"
              />
            </label>

            <label>
              Kinetic rate constant (per year)
              <input
                type="number"
                min="0"
                step="any"
                name="rate_constant_per_year"
                value={form.rate_constant_per_year}
                onChange={updateField}
                required
              />
              <small>Use an experimentally estimated value where possible.</small>
            </label>
          </div>
        </section>

        <section className="ils-panel">
          <h2>3. Soil characteristics</h2>

          <div className="ils-grid">
            <label>
              Soil pH
              <input
                type="number"
                min="0"
                max="14"
                step="any"
                name="soil_ph"
                value={form.soil_ph}
                onChange={updateField}
              />
            </label>

            <label>
              Organic carbon (%)
              <input
                type="number"
                min="0"
                step="any"
                name="organic_carbon_percent"
                value={form.organic_carbon_percent}
                onChange={updateField}
              />
            </label>

            <label>
              Clay (%)
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                name="clay_percent"
                value={form.clay_percent}
                onChange={updateField}
              />
            </label>

            <label>
              Soil temperature (°C)
              <input
                type="number"
                step="any"
                name="soil_temperature_c"
                value={form.soil_temperature_c}
                onChange={updateField}
              />
            </label>

            <label>
              Soil moisture (%)
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                name="soil_moisture_percent"
                value={form.soil_moisture_percent}
                onChange={updateField}
              />
            </label>

            <label>
              Forecast horizon (years)
              <select
                name="horizon_years"
                value={form.horizon_years}
                onChange={updateField}
              >
                <option value="5">5 years</option>
                <option value="10">10 years</option>
                <option value="15">15 years</option>
                <option value="20">20 years</option>
                <option value="25">25 years</option>
              </select>
            </label>
          </div>
          <p className="ils-help">
            These soil characteristics are recorded as metadata. This
            initial version does not invent pH, clay, or organic-carbon
            correction factors.
          </p>
        </section>

        <section className="ils-panel">
          <h2>4. Optional soil-partition model</h2>

          <div className="ils-grid">
            <label>
              Distribution coefficient Kd (L/kg)
              <input
                type="number"
                min="0"
                step="any"
                name="kd_l_kg"
                value={form.kd_l_kg}
                onChange={updateField}
                placeholder="Measured Kd"
              />
            </label>

            <label>
              Soil-water content (L/kg dry soil)
              <input
                type="number"
                min="0"
                step="any"
                name="soil_water_l_kg"
                value={form.soil_water_l_kg}
                onChange={updateField}
                placeholder="Measured water content"
              />
            </label>
          </div>
          <p className="ils-help">
            Enter both values to activate the equilibrium partition
            screening estimate. Leave both blank to skip it.
          </p>
        </section>

        <button className="ils-run" type="submit" disabled={loading}>
          {loading
  ? "Running simulation..."
  : `Run ${form.horizon_years}-Year Simulation`}
        </button>
      </form>

      {error && <div className="ils-error">{error}</div>}

      {result && (
        <section className="ils-results">
            
          <section className="ils-panel">
            <h3>Mathematical modelling workflow</h3>
            <p className="ils-help">
              The current scenario uses a first-order decay equation
              for the extractable Pb pool.
            </p>

            <div className="ils-process">
              <div className="ils-process-step">
                <div className="ils-process-number">01</div>
                <h3>Initial condition</h3>
                <p>
                  Initial extractable Pb concentration and
                  user-specified kinetic rate constant.
                </p>
              </div>

              <div className="ils-process-step">
                <div className="ils-process-number">02</div>
                <h3>Kinetic calculation</h3>
                <p>
                  Remaining extractable Pb is calculated using
                  C(t) = C₀ × e⁻ᵏᵗ.
                </p>
              </div>

              <div className="ils-process-step">
                <div className="ils-process-number">03</div>
                <h3>Pool estimation</h3>
                <p>
                  The difference between initial and remaining
                  extractable Pb is represented as a modelled pool.
                </p>
              </div>

              <div className="ils-process-step">
                <div className="ils-process-number">04</div>
                <h3>Scenario trajectory</h3>
                <p>
                  Results are displayed across the selected
                  simulation horizon.
                </p>
              </div>
            </div>

            <div className="ils-diagram-note">
              This equation describes the mathematical scenario.
              It does not independently establish a real microbial
              remediation rate or permanent immobilization.
            </div>
          </section>

          <div className="ils-result-heading">
            <div>
              <p className="ils-eyebrow">SIMULATION OUTPUT</p>
              <h2>{result.district || "Selected soil scenario"}</h2>
              <p>{result.treatment}</p>
            </div>
            <button className="ils-export" onClick={downloadCSV}>
              Export CSV
            </button>
          </div>

          <div className="ils-metrics">
            <Metric
              label="Initial total Pb"
              value={result.summary.initial_total_pb_mg_kg}
              unit="mg/kg"
            />
            <Metric
              label="Final total Pb"
              value={result.summary.final_total_pb_mg_kg}
              unit="mg/kg"
            />
            <Metric
              label="Final extractable Pb"
              value={result.summary.final_extractable_pb_mg_kg}
              unit="mg/kg"
            />
            <Metric
              label="Modelled immobilized pool"
              value={
                result.summary
                  .modelled_transfer_to_immobilized_pool_mg_kg
              }
              unit="mg/kg"
            />
          </div>

          <section className="ils-panel">
            <h3>Lead pool projection</h3>
            <p className="ils-help">
              Bar lengths are scaled to the largest displayed value.
              Total Pb remains constant in this closed-system scenario.
            </p>

            <div
  className="ils-chart ils-chart-monochrome"
  style={{
    backgroundColor: "#000000",
    border: "1px solid #333333",
    borderRadius: "12px",
    padding: "12px",
  }}
>
  <ResponsiveContainer width="100%" height={380}>
    <LineChart data={result.trajectory}>
      <CartesianGrid
        stroke="#444444"
        strokeDasharray="3 5"
      />

      <XAxis
        dataKey="year"
        stroke="#000000"
        tick={{ fill: "#000000" }}
        label={{
          value: "Simulation Year",
          position: "insideBottom",
          offset: -8,
          fill: "#000000",
        }}
      />

      <YAxis
        stroke="#000000"
        tick={{ fill: "#000000" }}
        domain={[0, "auto"]}
        label={{
          value: "Lead concentration (mg/kg)",
          angle: -90,
          position: "insideLeft",
          fill: "#000000",
        }}
      />

      <Tooltip
        contentStyle={{
          backgroundColor: "#111111",
          border: "1px solid #777777",
          color: "#ffffff",
        }}
        formatter={(value) => [
          `${Number(value).toFixed(2)} mg/kg`,
          "Concentration",
        ]}
        labelFormatter={(year) => `Year ${year}`}
      />

      <Legend
        wrapperStyle={{ color: "#000000" }}
      />

      <Line
        type="monotone"
        dataKey="total_pb_mg_kg"
        name="Total Pb"
        stroke="#FF3333"
        strokeWidth={3}
        dot={false}
      />

      <Line
        type="monotone"
        dataKey="extractable_pb_mg_kg"
        name="Extractable Pb"
        stroke="#168BFF"
        strokeWidth={3}
        dot={false}
      />

      <Line
  type="monotone"
  dataKey="modelled_immobilized_pool_mg_kg"
  name="Modelled Immobilized Pb"
  stroke="#000000"
  strokeWidth={3}
  dot={false}
/>
    </LineChart>
  </ResponsiveContainer>
</div>
          </section>

          {result.partition_model && (
            <section className="ils-panel">
              <h3>Equilibrium partition screening</h3>
              <Metric
                label="Estimated aqueous fraction"
                value={result.partition_model.estimated_aqueous_fraction}
                unit=""
              />
              <Metric
                label="Estimated aqueous Pb"
                value={
                  result.partition_model.estimated_aqueous_pb_mg_kg_soil
                }
                unit="mg/kg soil"
              />
              <p className="ils-help">
                {result.partition_model.interpretation}
              </p>
            </section>
          )}

          <section className="ils-panel">
            <h3>Scientific validation and limitations</h3>
            <p>
              <strong>Status:</strong>{" "}
              {result.validation.status}
            </p>
            <p>
              <strong>Mass balance:</strong>{" "}
              {result.validation.mass_balance}
            </p>
            <ul>
              {result.validation.limitations.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <p>
              <strong>ML readiness:</strong>{" "}
              {result.ml_model.status}
            </p>
            <p className="ils-help">{result.ml_model.reason}</p>
          </section>
        </section>
      )}
    </main>
  );
}