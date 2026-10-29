---
name: honest-data-states
description: Use whenever a screen shows plans, numbers or results.
---
# Honest data states

## One source badge per component (sentence case)
| Badge | When |
|---|---|
| Validated | validator.py passed for this plan |
| Validator failed | validator.py rejected; show reasons |
| Exact (enumeration) | domain.py exact engine |
| Exact (financial cover) | financial.py |
| QpiAI Opt · local solver | qpiai-opt mode="local" result (only if Phase 0 proved the call) |
| QAOA (warm start) · <backend> | qaoa.py; backend name from the job record |
| QCloud · <backend> | VQC run through qpiai-quantum; backend from job record |
| VQC · local statevector | qpiai_vqc.py 2-qubit statevector, not QCloud |
| GBDT + Platt (classical) | experiments_run2 model |
| Fallback | a quantum step failed; reason shown |
| Classical re-plan | recovery re-plan run on the exact engine |
| Simulated · held-out run | exposure / SLA-miss figures |
| Preview | fixture, no backend |
Never say "quantum hardware" unless the job record names a QPU.

## Values
- ETAs and P(late) show intervals and a "simulated" tag.
- Money in ₹ with "assumed rate" tag when converted from $ (see qpiai-compliance-gate).
- Team claims (0.0% fallback, Brier −46.9%, regret −30.8%) only next to a run ID and log link.
- Comparison tables: gap to optimum, feasibility rate, then runtime; caption "No speed-up claimed".

## Empty / error
Plain sentence, the next action, no illustration on data screens (illustrations only on first-run empty states, max one).
