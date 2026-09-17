import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {get} from 'node:https';

export const publicAddress = address => {
  if (isIP(address) === 4) {
    const [a,b] = address.split('.').map(Number);
    return a > 0 && a < 224 && a !== 10 && a !== 127 && !(a === 100 && b >= 64 && b <= 127) && !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && [0,168].includes(b)) && !(a === 198 && [18,19,51].includes(b)) && !(a === 203 && b === 0);
  }
  return isIP(address) === 6 && /^2[0-9a-f]{3}:/i.test(address) && !/^2001:(db8|0):/i.test(address);
};
export async function resolveImage(raw, hosts) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443' || !hosts.some(h => url.hostname === h || url.hostname.endsWith('.' + h))) throw new Error('生图结果来自未配置的图像域名，请联系管理员。');
  let addresses = await lookup(url.hostname, {all: true}).catch(() => []);
  if (!addresses.length || addresses.some(({address}) => !publicAddress(address))) {
    // A local proxy can synthesize private DNS answers. Resolve the allowlisted
    // hostname via public DNS, then pin that address for the TLS connection.
    const dns = await fetch('https://dns.google/resolve?name=' + encodeURIComponent(url.hostname) + '&type=A', {signal: AbortSignal.timeout(15000)});
    const data = await dns.json(); addresses = (data.Answer || []).filter(a => a.type === 1).map(a => ({address:a.data, family:4}));
  }
  if (!addresses.length || addresses.some(({address}) => !publicAddress(address))) throw new Error('生图结果地址不可使用。');
  return {url: url.href, addresses};
}
export async function downloadPinned(destination, signal, maximum) {
  return new Promise((resolve, reject) => {
    const req = get(destination.url, {signal, lookup: (_name, options, callback) => {
      const first = destination.addresses[0];
      if (options.all) callback(null, destination.addresses); else callback(null, first.address, first.family);
    }}, res => {
      if (res.statusCode !== 200 || Number(res.headers['content-length']) > maximum) {res.resume(); reject(new Error('原图暂未下载完成，可以继续获取原图。')); return;}
      const chunks = []; let length = 0;
      res.on('data', chunk => {length += chunk.length; if (length > maximum) res.destroy(new Error('生成图像超过本站容量限制。')); else chunks.push(chunk);});
      res.on('end', () => resolve(Buffer.concat(chunks))); res.on('error', reject);
    });
    req.on('error', reject);
  });
}
