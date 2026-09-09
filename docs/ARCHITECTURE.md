# Architecture

The application is a static React/TypeScript/Vite site. `LocalCanonProvider` fetches only six whitelisted local JSON files plus the local scene manifest. Zod validates published events; the build validator checks the complete relational graph and primary-text evidence.

Zustand owns place, character, chapter, event, reading progress, tour and quality selection. Selection actions perform compound updates. `relatedPlaces` includes sourced residencies and reviewed event associations; it does not infer live attendance.

`GardenScene` owns one Drei CameraControls instance. Free orbit, place camera transitions and GuidedTourController hand over control through tour state. A tour interpolates each edge of the same path graph that generates visible roads; manual dragging pauses it. Scene picking follows extras `placeId` up the parent chain and uses transparent bounding proxies for small targets.

Blender uses Z-up. Manifest conversion is `(x,y,z) -> (x,z,-y)`. glTF's exporter handles geometry conversion; it is never rotated a second time. Partition origins remain identity. Browser placement is applied once. Both overviews preserve per-place roots; a selected partition replaces its root after loading. The low overview merges independently decimated geometry per destination with vertex colors and preserves semantic hotspots. `mobileModel` selects a separate mobile partition. An LRU keeps 4 high or 2 low partitions and releases evicted geometry/material/texture resources.

The master scene stores generated collections and `Manual_Adjustments`. Images are packed. Temporary web LOD modifiers do not alter the saved master. `refined_modules.py` generates distinctive courts and finer architectural/plant components. `models:optimize` preserves uncompressed baselines and validates all 26 Draco GLBs after actual decoding: extras, transforms, material names and bounds. Draco JS/WASM and license files are served locally.

Water is a bounded local shader; low quality disables shader animation and shadows. Still low-quality views render on demand. DPR is capped at 1.5/high and 1/low. Touch devices default to low quality. High-quality static shadows update on scene changes, not every water frame. Interior inspection temporarily hides selected roof materials and focuses on a room hotspot; returning restores the roof. Tour arrival uses the destination overview camera so a near-ground road node does not frame a wall.

Architectural evidence is prepared from reviewed primary-text paragraphs into `config/architecture.json` and `places.features`. Source chapter gates apply to feature display under spoiler protection. Structural counts and named planting/furnishings are distinguished from interpreted dimensions, ornament and site orientation.

`server.mjs` serves only `dist/`, with correct WASM/GLB MIME types, CSP, ETags and precompressed text assets. The deployment packager creates an isolated Docker context and excludes Blender, source caches and credentials. Zeabur runs this service on the existing California dedicated server. Published models/data revalidate; hashed application chunks and the fixed decoder cache immutably.

`SimulationProvider` is a future boundary only. A real integration must read a fixed upstream OpenStory revision, map IDs/coordinates/ticks, handle disconnects, and publish `generated` records separately. No simulation service or placeholder fake-response provider is running.

Debug projection/metrics hooks compile only in Vite `test` mode. End-to-end builds use `.test-dist`, leaving production `dist` separate.
