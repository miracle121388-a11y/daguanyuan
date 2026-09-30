# OpenStory attribution and modifications

This project includes adapted prompts and a TypeScript/Node implementation of the story-mode workflow from ZJU-LLMs/OpenStory, licensed under Apache-2.0. Source revision and original file hashes are in provenance.json. Original license is preserved in LICENSE and distributed at /licenses/openstory/LICENSE.txt.

Modified on 2026-09-29: Redis/Ray lifecycle was adapted to the existing browser snapshot engine; fixed chapter 80 became edition-aware context; 12 daily plan slots became up to six upcoming two-hour steps; dialogue is capped at four alternating turns; state changes use structured, bounded outcomes. Existing navigation, player interactions and saves are retained. Python plugins and upstream datasets are not included. This is a port of the story mechanism, not an unchanged deployment of the full upstream service.
