# Simulation UI finish review

## 1. Disposition

**FIX — one bounded mobile follow-view correction.** The extension fits the established paper, jade, cinnabar and serif interface. Desktop controls, movement, dialogue and personal memory form a coherent MVP. No redesign or garden-art changes are warranted.

## 2. Scope and evidence

Reviewed the simulation panel, its styles, character rendering/follow camera, and App integration against `.impeccable/simulation-surface.md`, PRODUCT.md, DESIGN.md, Impeccable's craft floor and Operate guidance. The existing garden is inherited context; this review does not reopen its art acceptance. An approved replacement comp is not required for this extension.

Personally opened all seven rendered screenshots under `D:/Users/Lenovo/Desktop/大观园/output/playwright/simulation-final/`:

- `desktop-initial.png`, `desktop-moving-paused.png`, `desktop-dialogue.png`, `desktop-memory.png` — 1440×900.
- `mobile-initial.png`, `mobile-memory.png` — 390×844.
- `mobile-320.png` — 320×740.

Also read `output/playwright/simulation/report.json` and `output/playwright/simulation-final/report.json`. The first records actual movement, pause and rendered-position restoration; the packaged-site report records IF isolation, dialogue memories, automatic operation, snapshots, cancellation, mobile interaction and zero runtime/resource errors. These are supplied executed-test records, not tests rerun by this reviewer. The captures use Edge/SwiftShader and do not establish physical-device performance. The subsequent knowledge-ID correction is internal engine work and does not alter this visual assessment.

## 3. Material findings

1. **P2 — The expanded mobile follow view loses the visible figurine.** In `mobile-memory.png` and `mobile-320.png`, Baoyu and Daiyu's nameplates remain clear, but their actual bodies cannot be reliably distinguished below the labels and foliage. The connection between a person's recorded experience and the person in the scene is therefore weak precisely when reading their memory. The scene shrinks to about 180–198px tall, while the camera retains its desktop distance and the screen-space nameplate retains a 38px minimum height.

   **Exact targets:** [FollowCamera initialization and placement](D:/Users/Lenovo/Desktop/大观园/src/scene/SimulationActors.tsx:74), [nameplate anchor](D:/Users/Lenovo/Desktop/大观园/src/scene/SimulationActors.tsx:69), and [mobile panel/nameplate sizing](D:/Users/Lenovo/Desktop/大观园/src/styles/simulation.css:101). Adjust the follow framing and/or label clearance for the actual visible scene height. Keep the existing models and vegetation intact.

## 4. Advisory findings

- The desktop hierarchy is clear: world/time, next Tick, automatic/pause operation, then the IF condition. The 390px initial view preserves accessible primary controls and a substantial scene; the expanded mobile layouts preserve readable 14px memory prose, panel scrolling, the close/collapse controls, footer and bottom navigation. No horizontal clipping is visible in the supplied narrow captures.
- The reported detector's 24 findings are advisory. Local type sizes and the small color exceptions do not justify a mechanical type-ramp rewrite; DESIGN.md explicitly records the incumbent's varied auxiliary sizes. Small metadata is secondary to the readable memory text. The detector was not rerun.
- Fictional simulation identity remains explicit in the panel and footer, with the source/canon distinction explained separately. No visual claim of literary reconstruction was introduced.
- Named native controls, pressed states, focus handling and Escape integration are present in source. This review does not claim an independently executed keyboard or screen-reader audit.

## 5. Acceptance criteria for the fix

- At both 390×844 and 320×740 with the memory sheet expanded, the followed person's head/body and location on the path are visibly distinguishable, with the nameplate clear of the body.
- When Baoyu and Daiyu meet, both figurines remain recognizable and their labels stay readable. Keep a visible scene above the sheet, reachable collapse/exit controls, and persistent bottom navigation.
- Confirm the correction with one targeted mobile capture batch, including the meeting/memory state. Retain the desktop follow composition and manual-orbit release behavior. No further detector pass or unrelated garden refinement is needed.

---

## Bounded verdict pass — 2026-09-15

**Finding 1: RESOLVED. Current disposition: SHIP for the simulation extension.** This verdict supersedes the initial FIX above and closes its only material finding.

Personally reopened all seven regenerated screenshots at the same `D:/Users/Lenovo/Desktop/大观园/output/playwright/simulation-final/` paths. In both [390×844 expanded memory](D:/Users/Lenovo/Desktop/大观园/output/playwright/simulation-final/mobile-memory.png) and [320×740 expanded memory](D:/Users/Lenovo/Desktop/大观园/output/playwright/simulation-final/mobile-320.png), Baoyu's red and Daiyu's blue-green head/body silhouettes are distinguishable on the paved path. Their labels sit above the bodies with readable names. The scene, collapse/exit controls, readable memory content, footer and bottom navigation remain visible. The 320px capture makes the separation particularly clear; the 390px capture also meets the original MVP criterion.

The four refreshed desktop captures retain the established panel hierarchy and readable figures/dialogue. The refreshed mobile initial view also shows the followed figure on the path. No material regression is visible in this capture batch.

Source inspection confirms that [FollowCamera](D:/Users/Lenovo/Desktop/大观园/src/scene/SimulationActors.tsx:74) now responds to canvas dimensions and shortens its offset only for narrow, short canvases. The desktop offset and manual-orbit release handler remain present. [Mobile nameplate placement](D:/Users/Lenovo/Desktop/大观园/src/styles/simulation.css:107) raises the labels by half their height. This is a scoped framing correction; the garden models and vegetation are outside this change.

Evidence identity:

- Packaged candidate: `.deploy/reference-20260915-040639-298882`, feature `simulation-20260915-v1`, 434 files / 46,742,626 bytes, as recorded in [simulation-release.json](D:/Users/Lenovo/Desktop/大观园/reports/acceptance/simulation-release.json). Deployment was still recorded as `not-deployed` at this review.
- Refreshed [functional report](D:/Users/Lenovo/Desktop/大观园/output/playwright/simulation-final/report.json): `2026-09-15T04:07:06.112Z`, `http://127.0.0.1:4277/`, 18 recorded checks passed, no runtime errors or failed requests. It identifies **Edge / default renderer**, superseding the earlier batch's forced-software context. This does not establish physical-device performance.
- `mobile-memory.png` SHA-256: `af539e1ace2621c395d4e08203291c055475b7383e4f45aada8f62b9507c4eaa`.
- `mobile-320.png` SHA-256: `af242ffc98a02b25a1680aa1c752e82268472f6b159f1ffdd349827694dd0a7a`.

No browser tests or detector were rerun by this reviewer. No further visual correction is required within this review's original scope.
