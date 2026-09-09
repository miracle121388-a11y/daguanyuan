# Third-party notices

## Literature
《紅樓夢》古典原著为公版。数字文本来自维基文库 https://zh.wikisource.org/wiki/紅樓夢 ，页面数字整理依据其 CC BY-SA 4.0 / GFDL 声明使用并署名。具体章节、修订号、获取日期与片段保存在 references/sources.json。应用中的摘要为本项目整理，非原文逐字引文。

## Poly Haven assets
Source: https://polyhaven.com/ ; license: CC0 1.0, https://polyhaven.com/license . Exact creators, files, license snapshot, checksums and modifications are in assets/manifest.json.

- Stone Wall 02: stone material; desaturated and tinted derivative.
- Wood Planks: timber material.
- Coast Rocks 02: imported and decimated rock geometry; recolored.
- Forest Grove: environment lighting for Blender reference renders.

No external complete Chinese architectural module was acquired. Sketchfab candidates failed access/verification; ACA was not used. Courtyard architecture, roofs, paths, bridges and vegetation modules were authored procedurally for this project.

## Software
React, Three.js, React Three Fiber, Drei, Zustand, Zod, Vite, Vitest, Playwright, Lucide and glTF Transform are installed through npm; their package licenses remain in node_modules. Blender portable is obtained from the official Blender release server and used as a development tool under the Blender licensing terms; it is excluded from the static website.

No system font files are redistributed. No film frames, actor likenesses or music are used.

## Local Draco decoder
Google Draco is Apache-2.0 licensed. The locally hosted decoder files in public/draco are copied from the Three.js package's glTF decoder distribution. They decode only this project's local GLBs; no remote decoder request is required. Draco license and notice text are retained in references/licenses/draco-LICENSE and draco-AUTHORS.
