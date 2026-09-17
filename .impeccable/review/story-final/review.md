disposition: fix

No approved UI comp or QUALITY BAR card exists for this bounded extension. The packet supplies the direction in prose; no replacement-world FORM roll or seed is applicable. This review covers the supplied story surfaces only.

## persistence

Pass at extension scope. PRODUCT.md and DESIGN.md exist and establish the inherited ivory paper, jade controls, device Song typography, local assets, and separation of literary evidence from staging. The extension does not require rewriting the garden's visual world.

All seven required captures were opened and their PNG dimensions checked: desktop-library.png, desktop-comic.png, and cheng-comic.png are 1440×900; mobile-library.png and mobile-comic.png are 390×844; compact-comic.png and compact-library.png are 320×720. All are valid, loaded views matching their filenames. The compact library is a scrollable viewport capture, not a claim that its below-fold actions fit in the first screen.

[report.json](/D:/Users/Lenovo/Desktop/大观园/.impeccable/review/story-final/report.json) records **22 checks**, `passed: true`, no browser runtime errors, and no failed feature resources. Its coverage includes the initial edition, continuation filtering, edition and branch persistence, spoiler filtering, pause, manual navigation, reduced motion, narrow-screen overflow, and touch controls. These checks were read, not rerun by this reviewer.

[detector.json](/D:/Users/Lenovo/Desktop/大观园/.impeccable/review/story-final/detector.json) contains **37 findings: 1 warning and 36 advisories** (27 color and 9 font-size advisories). The visible warning is material fix 2. The advisories alone do not establish a visual defect in this inherited palette and typography.

## fidelity

| Element or promise | Assessment | Evidence |
| --- | --- | --- |
| TYPE | match | The library, chapter titles, and narration retain the specified Song character; interface controls remain compact and readable. Device typography is expressly pinned by PRODUCT.md and DESIGN.md. |
| MATERIAL | match within captured scenes | The focal content is actual full-color raster illustration, visibly showing embroidered clothing, foliage, architecture, and layered interiors. The shade supplies text legibility rather than replacing the artwork. Petals, manuscript, and bamboo compositions are visible in the supplied captures. |
| GROUND | match | The library preserves the ivory field and jade selection language; source uses the inherited paper value `#f3f0e6`. The full-screen interlude's dark jade lower field supports cream narration. No approved comp exists for a pixel-to-pixel color comparison. |
| Library composition and first-viewport memory | match | Desktop-library.png leads from edition and chapter choice to a large illustration and two clear actions. The remembered object is a literary scene, consistent with Experience mode. The background garden remains the incumbent surface. |
| Phone chapter selection and controls | adaptation | Mobile-library.png and compact-library.png replace the desktop list with a native select, justified by the requested mobile optimization. Both comic phone captures retain the subject, narration, three-shot navigation, 44px playback controls, and a full-width entry action. |
| Three edition contexts and evidence boundaries | match within source/report coverage | The catalog separates 80/120/108 editions and continuation nodes; `forkStory` creates a fresh IF branch, and `selectEdition` uses separate journal storage. The mobile Guiyou view explicitly says its chapter-82 setup comes only from the 2014 public heading, with no full-text claim. The report records restoration of the exact original Cheng journal after switching away and back. |
| AI/adaptation identity | match | The library artwork carries “AI 绘制 · 剧情演绎”; comic disclosures identify adapted narration rather than original quotation. Source details separately label staging and chapter-heading evidence. |
| Authored motion and manual control | contradicted in one terminal-shot state | Source implements 6.5-second shot progression, slow spatial motion, contextual particles, manual navigation, and static mode. However, the play/pause handler resets shot 3 to shot 1 even when its current command is Pause; see fix 1. |
| Desktop selected chapter treatment | contradicted against craft floor | Desktop-library.png visibly adds the 3px left stripe reported by the detector. The inherited selected fill already carries the state; see fix 2. |

## ceiling

No supplied quality-bar card supports an independent ceiling comparison. The bounded direction is visibly present: artwork fills the comic viewport, phone crops preserve the principal face, and the interface recedes behind the scene. No additional ornament, new visual identity, or raster replacement is required by this review.

Limits: this is a file and screenshot review, with the existing report used for behavioral evidence. No browser, detector, build, or test was run. The final-shot Pause defect is a deterministic source finding, not a newly reproduced browser failure. Continuous animation quality, real-device performance, screen-reader behavior, uncaptured poetry/storm imagery, provenance hashes, deployment, and the previous garden audit are outside this disposition. The catalog was read as reviewed project data; its external historical sources were not independently re-researched.

## material_fixes

1. **Preserve the current shot when pausing at the end.** In [StoryExperience.tsx:92](/D:/Users/Lenovo/Desktop/大观园/src/panels/StoryExperience.tsx:92), `if (frame === 2) setFrame(0)` runs for both Play and Pause; natural progression leaves `playing` true on the third shot, so clicking “暂停漫画” returns to the first. Make Pause only stop playback, retaining shot 3 and its narration; keep restarting on the existing Replay action or an explicit Play-from-ended path. Confirm this terminal-shot case, which is not established by the supplied generic pause check.
2. **Remove the thick chapter-selection side stripe.** In [story.css:29](/D:/Users/Lenovo/Desktop/大观园/src/styles/story.css:29), remove the 3px left border and its compensating padding change. Preserve the pale-jade selected fill, arrow, `aria-pressed`, and stable text alignment. This closes the detector's sole warning and the visible craft-floor discrepancy in desktop-library.png.

## keep

Keep the full-color scene scale, face-preserving mobile crops, inherited ivory/jade Song interface, compact controls, explicit AI and evidence boundaries, edition-isolated IF worlds, and existing garden unchanged while applying these two fixes.
