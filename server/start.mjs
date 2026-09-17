// Initialize only this service's mounted album, then drop root before HTTP starts.
import {mkdir, chown} from 'node:fs/promises';
const album = '/data/dreams';
await mkdir(album, {recursive: true, mode: 0o700});
if (process.getuid?.() === 0) {
  await chown(album, 1000, 1000);
  process.setgid(1000); process.setuid(1000);
}
process.env.DREAM_STORAGE_DIR = album;
await import('../server.mjs');
