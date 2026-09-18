# 梦绢：在既有梦藏中的局部扩展

Mode: Experience for paintings, the album and comics; Operate for the creation form. This is a narrow extension of the existing ivory/jade/device-Song system, not a replacement visual world. The user supplied a precise first-phase style brief; no new concept choice, QUALITY BAR card or webpage comp was introduced.

THESIS: The visitor's actual plot becomes a matte silk narrative painting with traceable origins and a stable catalog number. The artwork leads; the surrounding collection provides quiet reading and controls.

OWN-WORLD: Inherit `DESIGN.md` and `.impeccable/dream-surface.md`. Preserve ivory paper, ink text and jade actions. New painting mat: 10px ivory, 1px seam, 2px radius, full image contained; no image badge or hover zoom. Preserve all three literature contexts and the existing single-image motion-comic player.

STORY: Select an existing scene or actual personal moment, open the existing creation form, generate through Qwen, collect, replay and export. The title leads, then card number/style, edition/chapter/branch, place/trigger, actions and optional provenance. Legacy images remain visibly original-style.

FIRST VIEWPORT: Desktop album retains two columns. Real current and legacy samples provide a comparison, with title and catalog line under each image. On 390/320px and the user's observed 441×694 in-app viewport, use the existing single-column scrollable dialog. The creation form retains its reachable submit action and adds a small Dream Silk explanation in the scene column.

FORM: Existing gallery and creation dialog. Signature interaction remains “this experienced moment becomes a collectible painting” with expand → pause/manual shot → return to the unchanged album. Reduced motion is inherited, not redesigned.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Scope and truth

- UI: `src/panels/DreamExperience.tsx`, the catalog addition in `StoryExperience.tsx`, `src/styles/dreams.css`.
- Data/provider: eight-section audit record, continuous generation instructions, native negative prompt, at most three role-specific reference images, exact seed/settings/hash, stable NO./IF. numbering and legacy migration.
- Default reference assets are temporary crops/assemblies of existing reviewed generated art. They are not historical originals or final character sheets. Twenty-one files plus source/hash sidecars are published from reviewed canon; runtime missing assets fall back to text.
- New art surface should show matte mineral color and pen contours, without glossy idol face, CG lens effects or drawn interface/text. Four character entrances and all exact cast combinations exist; current actual acceptance scene has Daiyu alone.
- The first real `dream-silk-1` sample was technically successful but visually rejected: the model drew numbered prompt headings into the image. Its image and exact report remain at `output/imagegen/dream-silk/qwen-silk-first.png` and `reports/acceptance/dream-silk-rejected-1.json`. It is not evidence of acceptable final art.
- The second sample removed headings but still drew the bibliography as a footer; it too is rejected (`qwen-silk-2.png`, `dream-silk-rejected-2.json`). The third local image improved matte material and omitted visible text, but retained the reference writing/chin pose. Its original UI finish review remains scoped to that surface. The first online flower-burial sample again copied the pose and added a caption; it is explicitly rejected in `dream-silk-rejected-online-1.json`. Historical evidence is archived in `output/playwright/dream-silk-3-evidence/`.
- `dream-silk-4` puts current action first, uses compact English generation prose, and optionally reuses the existing text provider for one saved visual scene plan. `dream-references-2` removes the Daiyu reference's hands and desk. The actual fourth local sample, `output/imagegen/dream-silk/qwen-silk-4.png`, shows the requested crouching, open bag and gathered petals without visible text. No UI redesign followed; `.impeccable/review/dream-silk-action/` records the new-art interaction regression and bounded art review. Future art consistency remains a first-phase limitation.
- Screenshot harness selects only the current real sample and legacy art from the private test album; all previous trials remain on the server. This test filter is not product code or default inventory. Browser smoke blocks generation POSTs.
- Comic uses one image over three camera positions and narration; not frame-by-frame animation or multiple generated images. Reference and result quality are a first phase, not a promise of perfect style/character consistency.
- The new-art review found A1: the inherited generated-comic crop concealed hands and the flower bag on phones, with the lower shade obscuring the action on desktop. One correction makes generated-art shots 1 and 3 contain the whole painting, outside the heading/narration and without shade; shot 2 retains the intimate view. The confirmation packet is `.impeccable/review/dream-silk-action-confirm/`, with 29 executed checks. This correction also applies to legacy generated paintings; preset story comics are unchanged.

## Boundaries

Preserve global `DESIGN.md` (SHA-256 `720c42d85f20a127257eab8fe6006ade0cf6e2470bebcd9d42e2962a2a0c4990`) and `.impeccable/design.json` (`b3dcbe7399ed5b92e82ba2746951ce7f4f04ac51dfe017eef297d0579c9ce8ad`). Documenter may update only the matching Dream surface supplement after review; do not rewrite global tokens. Existing garden models, scenes, literature evidence, personal simulation and unrelated services are outside the change.
