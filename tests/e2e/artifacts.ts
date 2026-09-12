import fs from 'node:fs';
import type {Page} from '@playwright/test';
export function writeArtifact(path:string,data:string|Buffer){const temporary=path+'.'+process.pid+'.next';fs.writeFileSync(temporary,data);fs.renameSync(temporary,path)}
export async function shot(page:Page,path:string){writeArtifact(path,await page.screenshot())}
