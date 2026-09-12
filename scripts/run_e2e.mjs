import {spawnSync} from 'node:child_process';
import {copyFileSync,existsSync} from 'node:fs';
import {replaceFile} from './atomic_replace.mjs';
const report=`reports/acceptance/playwright-${Date.now()}.json`;
const result=spawnSync(process.execPath,['node_modules/@playwright/test/cli.js','test',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,GARDEN_TEST_REPORT:report}});
if(existsSync(report)){copyFileSync(report,'reports/acceptance/playwright.json.next');replaceFile('reports/acceptance/playwright.json.next','reports/acceptance/playwright.json')}
process.exit(result.status??1);
