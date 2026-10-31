# arQ · Dispatch workspace

![Editorial illustration of a delivery van following a route through an abstract city](frontend/src/assets/brand/arq-route-editorial.png)

**A local-first fleet dispatch prototype for reviewing routes, proposals, and solver evidence.**

The web workspace and driver preview are built for the Quant-A-Maze 3.0 QML-01 challenge. They use dispatcher records when available and keep simulated, preview, and unavailable data states visible. Quantum advantage, live-fleet use, calibrated risk, and QPU execution are not established.

## Web workspace

The React + TypeScript app includes command and map views, dispatch planning, plan comparison, fleet and order records, analytics, diagnostics, and recovery. The driver app remains a preview where backend endpoints are unavailable.

```sh
cd frontend
npm ci
npm run dev
```

For a production bundle, run `npm run build` from `frontend/`. The project-level commands are listed in [AGENTS.md](AGENTS.md), with current integration constraints in [docs/ARQ_INTEGRATION_STATUS.md](docs/ARQ_INTEGRATION_STATUS.md).

## Visual asset

The route illustration is original generated editorial artwork. It is decorative and does not represent a real city, live map, fleet position, or dispatch result.
