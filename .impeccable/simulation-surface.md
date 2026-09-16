# 世界推演面板

Mode: Operate, inside the established garden experience.

Direction: extend the paper, ink, jade and cinnabar reading interface recorded in DESIGN.md. No replacement identity, imagery or typography. Desktop places a 402px working panel next to the existing interactive garden; mobile keeps the scene above a bounded scrollable sheet, with persistent navigation.

First viewport: the existing garden remains the subject. The panel shows world identity, time, a single next-tick action, pause/auto controls, and the concrete IF example. Creating an IF changes knowledge or state without advancing time or moving anyone; running the next Tick then lets people act along the garden's actual road graph.

Signature interaction: an individual character follows a validated road route; the camera can follow or be released by manual orbit. Conversation appears at the figures and enters both personal histories. Restore makes the rendered positions agree with the saved world.

Quality bar: the four characters are intentionally abstract 3D stage figurines. All novel personality values, dialogue, stage anchors and outcomes must read as simulated. Canon, spatial interpretation and staged routes stay separate. No external runtime assets or replacement garden models.

Required responsive evidence: desktop 1440×900, mobile 390×844 and 320×740. Show initial control hierarchy, actual movement/dialogue, personal memory, and a visible scene above the mobile panel. Verify loading, failures, cancelled ticks and keyboard controls. Software-rendered browser evidence is not device-performance evidence.

Scope: src/panels/SimulationPanel.tsx, src/styles/simulation.css, src/scene/SimulationActors.tsx, integration controls in App.tsx and context-loss handling in GardenScene.tsx.

---

## Built-surface supplement — 2026-09-15

### Overview

The built extension is “一念之间 / 世界推演 · IF 反事实实验”. It adds an operating surface to the incumbent garden; the global authority remains `DESIGN.md` and `.impeccable/design.json`. Four code-built stage figurines share the existing garden and road graph. Their appearance, personality, numbers, speech and outcomes are simulation settings. No replacement visual world or bitmap assets were introduced.

### Colors

Use the existing `paper-light` for the panel and speech, `paper` for editable fields, `ink` for reading, `muted` for metadata, and `line` for separators. Jade identifies the primary action, selected world/person, dialogue text and follow labels; cinnabar identifies the selected record category, the changed condition and focus. Existing canonical values remain in `DESIGN.md` and `src/styles/reference-world.css`.

The four actor colors also connect the body, ground ring, active route and person-picker dot: Baoyu (`#9c493b`), Daiyu (`#416b67`), Baochai (`#9a7435`), Wang Xifeng (`#77506c`), from `src/simulation/world.ts`. These identify simulated actors, not literary attributes. Example buttons and branch hover share pale green (`#e7ebdf`); errors use dark rust (`#87412c`) on warm paper (`#f4e9df`).

### Typography

Reuse the device serif stack (`STSong, Songti SC, SimSun, serif`) for titles, time and narrative; use the incumbent Chinese sans-serif stack for controls and metadata. The panel title is 26px/1.4 with 2px tracking, changing to 21px at ≤900px and 1px tracking at ≤600px. Time is 19px/1.5; IF heading 18px/1.5; person heading 22px/1.4. Event and memory prose stays 14px/1.85 across sizes. Controls and metadata range from 10–13px; these auxiliary sizes do not define a replacement global type scale. The IF textarea is 13px/1.8 on desktop and 16px/1.7 at ≤900px; mobile input/select text is also 16px.

### Layout

| Viewport | Built arrangement |
| --- | --- |
| Above 1180px | Garden and nonshrinking 402px right panel; 1px dividing border. Panel heading, world bar and footer surround an independently scrolling body with 24px horizontal padding. |
| 901–1180px | Same arrangement with a 360px panel and tighter existing header spacing. |
| ≤900px | Garden above a full-width sheet. Default sheet height is 54% of the workspace; expanded is 73%. Garden minimum height is 180px. Body padding becomes 13px 18px 22px; expand/collapse appears in the heading. |
| ≤600px | Default sheet height is 56%; expanded retains 73%, capped at `calc(100% - 180px)`. Workspace reserves `52px + env(safe-area-inset-bottom)` for persistent bottom navigation. |

Opening simulation removes the ordinary index/detail from this workspace and hides the tour/read-status strip and atmosphere control. Mobile also hides the scene-bottom area. The panel header, branch selector, close/collapse and footer stay outside its scroll area. Record lists use continuous rows; the relationship table has its own horizontal overflow container.

### Elevation & Depth

The panel is a flat paper column/sheet with separator lines and no added panel shadow. Speech uses the existing small-paper vocabulary, with shadow `0 5px 20px #283b2929`. The garden supplies spatial depth; the record list does not add card shadows.

### Shapes

Controls and fields use 3px corners, examples/nameplates 2px, speech 4px. Primary run controls are at least 44px high. Mobile branch/category controls are 44px, world/example controls 36px, person selectors 40px and nameplates 38px; the close button is 40px square. Do not describe every control as a 44px target.

### Components

- **Action and state:** world selection and Tick remain above the scroll area. “运行下一 Tick” is the single filled action; its neighbor switches between automatic operation and pause/continue. Busy phases disable conflicting actions and expose “撤销本步”. Status text distinguishes parsing, thinking, execution, pause, automatic and saved states. Running waits for scene readiness. Loading, storage notices and dismissible errors appear near the controls; server-configuration failure has a retry.
- **IF condition:** a labeled, 400-character textarea includes three examples and a full-width outlined create/replace action. The visible copy explains replacement of the IF branch and preservation of the main world. The changed condition is shown separately with its fork Tick.
- **Records:** three pressed-state buttons select “园中纪事”, “人物心迹” and “时间快照”. Events show time, kind and narrative; rule/relationship metadata is quieter, dialogue is jade. Personal memory shows the newest eight entries in reverse order with Tick and origin; the displayed count is the total. Relationships use a table with an explicit simulation caption. Snapshots show current/restore states, the latest-30 retention notice and export. The footer keeps “全园观察” and “本地存档 · 虚构推演” visible.
- **Follow and speech:** choosing a person or a scene nameplate focuses the actor. The camera uses 48° FOV, offset `(15, 16, 22)` and target one world unit above the actor. Only when the actual canvas is ≤900px wide and <600px tall, that offset scales by `min(.8, max(.36, height / 520))`. Resizing recomputes framing. Manual orbit releases follow; selecting/following again restores it. Nameplates anchor at height 2.3, rise by half their own height at ≤900px, and shift left/right by 35% when actors share a location. This is a simple separation rule, not general collision avoidance. Speech anchors at height 4.2 and is capped at `min(270px, 70vw)`.
- **Focus and motion:** opening focuses the panel heading; named controls, pressed/expanded states, status/alert roles and App-level Escape handling are present. Controls inherit the 2px cinnabar focus ring; the textarea uses a 3px outline offset. Pausing or hiding the document stops actor playback; hiding also stops automatic ticks. The reduced-motion CSS removes panel animation/smooth scrolling, and the garden motion setting gates body bobbing; these do not imply all user-requested simulation movement is removed.

### Do's and Don'ts

- **Do** preserve visible people and their path above the expanded mobile memory sheet, with labels clear of their bodies.
- **Do** keep literature evidence in the existing index distinct from IF knowledge, personal memories, stage anchors and outcomes.
- **Don't** promote the abstract figurines or this feature's acceptance into an approval of the broader garden art.

Evidence: the documenter opened all seven final PNGs in `output/playwright/simulation-final/`: four desktop states at 1440×900, initial/memory at 390×844, and expanded memory at 320×740. The expanded views show both Baoyu and Daiyu on the path. `reports/acceptance/simulation-ui-review.md` closes its sole mobile-follow finding as **RESOLVED — SHIP**, scoped to this extension. The supplied `report.json` records 18 passed checks, no runtime errors or failed requests, at `2026-09-15T04:07:06.112Z` on `http://127.0.0.1:4277/`, **Edge / default renderer**. This documentation pass ran no browser tests, accessibility audit, detector or performance measurements. The records do not establish physical-device performance or public deployment verification; release status remains in `docs/PROGRESS.md` and release evidence.
