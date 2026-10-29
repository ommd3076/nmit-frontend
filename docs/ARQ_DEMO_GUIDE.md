# arQ — Comprehensive Live Demonstration Guide

*Operator & Hackathon Evaluator Journey*

---

## 1. Quick Start Commands

```bash
# 1. Start development server
cd frontend
npm run dev

# 2. Run unit and component test suite
npm test

# 3. Compile production build
npm run build
```

The web application opens at `http://localhost:5173`.

---

## 2. Canonical Evaluator Journey (Step-by-Step)

### Step 1: arQ Command Center Showcase
- **Action:** Open `http://localhost:5173`.
- **What to Observe:**
  - **Hero Geospatial Map:** MapLibre GL JS renders OpenFreeMap Positron tiles for the Bengaluru urban logistics corridor. Multi-colored vehicle routes overlay the road network.
  - **Top Health Pill:** Indicates `Simulation Mode` (or `Backend Online` if local FastAPI server is running) and `0/2` or `1/2 Solvers Active`.
  - **Live IST Clock:** Accurate Indian Standard Time clock updates every second.
  - **Floating Vehicle Chips:** Shows active vehicle callsigns, stop counts, and route colors.

### Step 2: Vehicle Selection & Camera Transition
- **Action:** Click vehicle `KA-04-MB-4819` (Mahindra Treo Zor EV) in the right panel or map legend.
- **What to Observe:**
  - The map camera smoothly pans and focuses on the vehicle's position near Hebbal.
  - Its route turns prominent while secondary routes remain subtly dimmed.
  - The right-hand operations panel updates to display its 6 ordered stops, battery percentage (42%), capacity utilization, and delay deviation (+18m late).

### Step 3: SLA Commitment & Stop Inspection
- **Action:** Click **Stop #3 (Aster CMI Hospital Central Stores)** in the stop timeline.
- **What to Observe:**
  - The **Stop Inspection Drawer** slides in.
  - **Commitment Window:** `14:15 – 15:00 IST` (contractual SLA).
  - **Predicted ETA:** `14:48 – 15:12 IST` (simulated interval).
  - **Late Probability:** `[44%, 62%]` with simulated tag.
  - **Penalty Exposure:** `₹3,200` (explicitly tagged `assumed rate ₹83/$`).
  - **Locked Status:** Displays dynamic (reschedulable) status with lock icon on served stops.

### Step 4: Mid-Shift Recovery Re-Plan Execution
- **Action:** In the stop drawer, click **"Trigger Mid-Shift Re-Plan from Stop #3"**.
- **What to Observe:**
  - A success toast appears confirming re-plan completion by `recovery.py`.
  - Previously completed stops (Stops #1 and #2) are marked `Locked (served)` with padlock icons.
  - Total SLA exposure drops, absorbing downstream delay via buffer slack.
  - An audit log event is automatically added to the Activity feed.

### Step 5: Fleet Operations & Telemetry Grid
- **Action:** In the left navigation rail, click **Fleet Operations**.
- **What to Observe:**
  - High-density data grid of all 4 fleet units.
  - Filter by status (`At Risk`, `Delayed`, `Active`).
  - Search by driver name (e.g. `Pradeep`).
  - Click any row to reveal the driver contact card, speed telemetry, and exact GPS coordinates.

### Step 6: Dispatch Planning & Optimization Job Trigger
- **Action:** Click **Route Planning** in the navigation rail.
- **What to Observe:**
  - Optimization architecture selector: `QpiAI Opt (local QUBO)`, `Warm-Start QAOA`, `Financial Exact Cover`, `Exact Enumeration`.
  - Drag the **SLA Delay Weight** slider (e.g. to `2.2x`).
  - Click **"Dispatch Optimization Run"**.
  - A job is submitted to the async pipeline. The navbar displays `1 Active Job` pulse indicator.
  - Review candidate route ribbons and click **"Publish Plan to Fleet"** to commit the manifest.

### Step 7: SLA Violation Risk & Financial Exposure
- **Action:** Click **SLA & Exposure** in the navigation rail.
- **What to Observe:**
  - Total financial exposure: `₹18,450 (assumed rate ₹83/$)`.
  - Route-by-route exposure cards (`KA-04-MB-4819: ₹8,400`, `KA-01-EC-9912: ₹8,800`).
  - Click a route card to isolate its specific at-risk customer commitments.

### Step 8: QML Intelligence & Platt Calibration Evidence
- **Action:** Click **QML Intelligence** in the navigation rail.
- **What to Observe:**
  - **USER CLAIMS Audit Box:** Displays verified team claims (Brier `0.142`, Brier reduction `-46.9%`, regret reduction `-30.8%`, `0.0% fallback`) linked directly to `experiments_run2` validation records.
  - **Platt Reliability Diagram:** SVG plot illustrating predicted vs observed empirical delay probabilities alongside the 45° ideal line.
  - **VQC Architecture Card:** Fully discloses 2-qubit statevector simulator execution (`qpiai_vqc.py`).
  - **Engine Benchmark Table:** Runtime, gap to optimum, and feasibility rates captioned with `"No speed-up claimed"`.

### Step 9: Solomon C101 Synthetic Benchmark Mode
- **Action:** In the top navbar scenario dropdown, select **"Solomon C101 (25-Customer Clustered Benchmark)"**.
- **What to Observe:**
  - The map seamlessly switches to the **SVG Flat Metric Space Renderer**.
  - Renders a 100×100 coordinate grid, the central depot square **D** at `(40, 50)`, multi-vehicle looping routes, and numbered customer nodes without basemap tiles.
  - Demonstrates versatility across both real GPS data and academic vehicle routing benchmarks.
