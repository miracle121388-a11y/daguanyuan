# Third-party notices

## Literature
《紅樓夢》古典原著为公版。数字文本来自维基文库 https://zh.wikisource.org/wiki/紅樓夢 ，页面数字整理依据其 CC BY-SA 4.0 / GFDL 声明使用并署名。具体章节、修订号、获取日期与片段保存在 references/sources.json。应用中的摘要为本项目整理，非原文逐字引文。

## Poly Haven assets
Source: https://polyhaven.com/ ; license: CC0 1.0, https://polyhaven.com/license . Exact creators, files, license snapshot, checksums and modifications are in assets/manifest.json.

- Forest Grove: local HDR environment lighting for the live scene and Blender.
- Island Tree 01 and Island Tree 02: branch and leaf geometry for near and middle tree models and the fifteen-view distant canopy atlas; lower trunks reshaped locally.
- Pine Sapling Small: source pine geometry and foliage for the local tree model and canopy atlas.
- Forest Ground 06: local soil and bamboo-bed surfaces.
- Grass Medium 01: decimated, ground-seated grass clumps.
- Wood Table 001: cropped fine timber grain for independent joinery, lattice, flooring and furniture material roles; the title is a source label, not a historic furniture claim.
- White Sandstone Blocks 02: quiet within-block stone surface samples, excluding source wall joints.
- Grey Roof Tiles: cropped surface detail for locally authored curved Chinese roof tiles; the source tile arrangement is not used as architecture.
- Mossy Sandstone: within-block weathered bank surface.
- Rock Moss Set 01: independently scanned rock shapes with uniform scaling and source UVs.
- Fern 02: two complete source plants for nearby understory and the selected courtyard within a fixed instance budget.
- Worn Mossy Plasterwall: wall texture; tinted in the runtime shader.

Exact source identifiers, creators and file-level attribution take precedence in assets/manifest.json. Wood Planks, Leafy Grass, Wood Cabinet Worn Long, Coast Rocks 02, Stone Wall 02, Forest Ground 05, Dark Wood, Lacquered Cherry Wood and Slate Floor 02 are retained as historical sources and are no longer assigned to the current garden. Mossy Rock, Mossy Cobblestone, Fine Grained Wood and Rosewood Veneer 02 are also retained historical sources. Forest Ground 04, Moss 01 and Bark Willow remain unused candidates.

Shared source JPEG material maps are encoded locally at quality 83; locally baked maps use quality 80. Source foliage alpha is retained from the licensed PNG maps. The canopy atlas and landscape light map are Blender renders of the actual source-derived scene. The material swatches are baked with the crop, color, roughness and physical UV settings recorded in config/craft.materials.json; contact shading on selected detailed architecture is baked from its geometry into vertex colors. Source files, material swatches, geometry and image derivatives have recorded SHA-256 hashes. These artistic material choices do not establish historical building materials. Fifteen generated visual references retain their original prompts and generation records.

No external complete Chinese architectural module was acquired. Sketchfab candidates failed access/verification; ACA was not used. Courtyard architecture, roofs, paths, bridges and supplementary vegetation modules were authored procedurally for this project; source-derived trees, grass and rocks are identified above. The r10 exports preserve continuous roof shells separately from simplified tiles and retain every upward floorboard face with its original UVs; hidden floor undersides and edge faces are omitted only in low partitions and overview. Cutaway tags and place picking remain. Low woody groups reuse the source crown form at reduced scale and a planted ridge extends the same editable landscape; these are artistic planting forms, not botanical identifications. Scalar ground-control maps derive from actual planted positions and shoreline, with768px/64-level delivery; provenance sidecars record their source master hash.

## Software
React, Three.js, React Three Fiber, Drei, Zustand, Zod, Vite, Vitest, Playwright, Lucide and glTF Transform are installed through npm; their package licenses remain in node_modules. Blender portable is obtained from the official Blender release server and used as a development tool under the Blender licensing terms; it is excluded from the static website.

No system font files are redistributed. No film frames, actor likenesses or music are used.

## Local Draco decoder
Google Draco is Apache-2.0 licensed. The locally hosted decoder files in public/draco are copied from the Three.js package's glTF decoder distribution. They decode only this project's local GLBs; no remote decoder request is required. Draco license and notice text are retained in references/licenses/draco-LICENSE and draco-AUTHORS.


r10 final candidate: fern diffuse and separate source alpha are connected before glTF export; actual delivered PNG transparency is verified. A low shrub is derived from the island_tree_01 leaf-island mesh with a reprofiled lower stem and crown; it is landscape interpretation, not a botanical claim. The exact same geometry is rendered in the fourth row of a 1920 × 1536, 20-view distance atlas. Continuous court pavement bedding retains its original footprint and material UVs through mobile LOD.


## r12 定点修正中的本地创作材质

芭蕉、竹叶、茎、花瓣和落叶色图由scripts/bake_focal_foliage.py以固定种子数值生成，见assets/processed/focal-r12-fix1/manifest.json及各图的来源／生成器哈希。这些是本项目的形态与材料解释，不属于Poly Haven下载、不代表原著提供了植物标本，也不是拍摄或生成的建筑照片。网页共享贴图的来源记录通过botanical_材质槽识别，并保留原始图像与交付图像各自的SHA-256。config/garden.planting.json为同一空间解释中的种植设计。


The r12-fix2 focal botanical swatches in assets/processed/focal-r12-fix2 are authored deterministic material maps from scripts/bake_focal_foliage.py, with origin, generator and file SHA-256 in their manifest. This second batch adjusts daylight values; the maps are neither photographs nor Poly Haven CC0 source assets. Existing reviewed architectural source licenses remain in assets/manifest.json.
