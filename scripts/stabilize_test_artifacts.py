from pathlib import Path
import re
R=Path(__file__).resolve().parents[1]
for name in ['garden.spec.ts','mobile.spec.ts','interior.spec.ts']:
 p=R/'tests/e2e'/name;s=p.read_text(encoding='utf8')
 s="import {shot,writeArtifact} from './artifacts';\n"+s
 s=s.replace("import fs from 'node:fs';\n",'')
 s=re.sub(r"await page\.screenshot\(\{path:([^}]+)\}\)",r'await shot(page,\1)',s)
 # Handle the one template expression containing braces separately.
 s=s.replace("await page.screenshot({path:`reports/browser/0${i+2}-${['xiaoxiangguan','yihongyuan','hengwuyuan','qiushuangzhai'][i]}.png`})", "await shot(page,`reports/browser/0${i+2}-${['xiaoxiangguan','yihongyuan','hengwuyuan','qiushuangzhai'][i]}.png`)")
 s=s.replace("fs.writeFileSync('reports/browser/11-phone-320.png.next',await page.screenshot());fs.renameSync('reports/browser/11-phone-320.png.next','reports/browser/11-phone-320.png')", "await shot(page,'reports/browser/11-phone-320.png')")
 s=s.replace('fs.writeFileSync(', 'writeArtifact(')
 if s.count('writeArtifact')==1:s=s.replace('{shot,writeArtifact}', '{shot}')
 p.write_text(s,encoding='utf8')
