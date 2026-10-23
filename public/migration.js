/* Domain migration is browser-to-browser only. Never put saved access or album
 * capabilities in URLs, logs, analytics or server requests. Keep both origins exact. */
(() => {
  const oldOrigin = 'https://daguanyuan-rumeng.zeabur.app';
  const newOrigin = 'https://daguanyuan.inspiralai.com';
  const status = document.querySelector('#status');
  const button = document.querySelector('#transfer');
  const say = text => { status.textContent = text; };
  const allowedKey = key => typeof key === 'string' && /^daguanyuan\.[a-zA-Z0-9_.-]+$/.test(key);
  const readStorage = () => Object.fromEntries(Object.keys(localStorage).filter(allowedKey).map(key => [key, localStorage.getItem(key)]));
  const openAlbum = () => new Promise((resolve, reject) => {
    const request = indexedDB.open('daguanyuan-dream-album', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('paintings', {keyPath: 'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('无法打开本机画册，请检查浏览器的存储权限。'));
  });
  const readPaintings = db => new Promise((resolve, reject) => {
    const request = db.transaction('paintings').objectStore('paintings').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('本机画册读取失败。'));
  });
  async function validate(payload) {
    if (!payload || payload.format !== 'daguanyuan-domain-migration-v1' || !payload.storage || typeof payload.storage !== 'object' || Array.isArray(payload.storage) || !Array.isArray(payload.paintings)) throw new Error('存档格式不正确，尚未导入。');
    if (Object.keys(payload.storage).length > 100 || JSON.stringify(payload.storage).length > 20 * 1048576 || payload.paintings.length > 200) throw new Error('存档超出迁移大小限制，请分版本导出后导入。');
    for (const [key, value] of Object.entries(payload.storage)) if (!allowedKey(key) || typeof value !== 'string') throw new Error('存档字段不正确，尚未导入。');
    let bytes = 0;
    for (const entry of payload.paintings) {
      if (!entry || typeof entry.id !== 'string' || entry.id !== entry.job?.id) throw new Error('画册记录不完整，尚未导入。');
      if (entry.image) {
        if (!(entry.image instanceof Blob) || !['image/png', 'image/jpeg', 'image/webp'].includes(entry.image.type) || entry.image.size > 18 * 1048576) throw new Error('画册图像格式不正确，尚未导入。');
        bytes += entry.image.size;
        if (bytes > 256 * 1048576) throw new Error('画册过大，请先下载原图留存。');
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await entry.image.arrayBuffer())), b => b.toString(16).padStart(2, '0')).join('');
        if (hash !== entry.job.imageSha256) throw new Error('画作校验不一致，尚未导入。');
      }
    }
  }
  async function receive(payload) {
    await validate(payload);
    const db = await openAlbum();
    try {
      const previous = readStorage(), paintings = await readPaintings(db);
      // A newly opened garden may already have generated an unused album identity.
      const hasWork = paintings.length > 0 || Object.keys(previous).some(key => /^daguanyuan\.simulation\./.test(key));
      const conflicts = Object.keys(payload.storage).filter(key => previous[key] !== undefined && previous[key] !== payload.storage[key] && (hasWork || /^daguanyuan\.simulation\./.test(key)));
      if (conflicts.length || paintings.some(p => payload.paintings.some(q => p.id === q.id && JSON.stringify(p.job) !== JSON.stringify(q.job)))) throw new Error('新站已有不同存档，为避免覆盖，本次未导入。请先在新站导出已有世界线，再使用一个尚无新站存档的浏览器配置完成迁移。');
      const written = [];
      try {
        for (const [key, value] of Object.entries(payload.storage)) { localStorage.setItem(key, value); written.push(key); }
        await new Promise((resolve, reject) => {
          const transaction = db.transaction('paintings', 'readwrite');
          const store = transaction.objectStore('paintings');
          const ids = new Set(paintings.map(p => p.id));
          for (const entry of payload.paintings) if (!ids.has(entry.id)) store.add(entry);
          transaction.oncomplete = resolve;
          transaction.onabort = transaction.onerror = () => reject(new Error('画册写入失败，请释放浏览器存储空间后重试。'));
        });
      } catch (error) {
        for (const key of written) { if (previous[key] === undefined) localStorage.removeItem(key); else localStorage.setItem(key, previous[key]); }
        throw error;
      }
      return {settings: Object.keys(payload.storage).length, paintings: payload.paintings.length};
    } finally { db.close(); }
  }
  if (location.origin === newOrigin) {
    button.hidden = true;
    document.querySelector('#old').hidden = false;
    document.querySelector('#title').textContent = '接续大观园里的故事';
    document.querySelector('#intro').textContent = '这里是新的大观园。完成存档转移后，再进入游园即可继续原有故事。';
    const nonce = location.hash.slice(1);
    history.replaceState(null, '', location.pathname);
    if (!window.opener || !/^[a-f0-9]{32}$/.test(nonce)) { say('需要在旧站的搬迁页面点击“带上存档，进入新园”。'); return; }
    let accepted = false;
    window.addEventListener('message', async event => {
      if (accepted || event.origin !== oldOrigin || event.source !== window.opener || event.data?.type !== 'garden-migration-data' || event.data?.nonce !== nonce) return;
      accepted = true;
      try {
        say('正在校验并保存故事与画册……');
        const result = await receive(event.data.payload);
        say(`搬迁完成：${result.settings} 项本机存档与设置、${result.paintings} 幅画册记录。可以进入新园继续游玩。`);
        window.opener.postMessage({type: 'garden-migration-done', nonce}, oldOrigin);
      } catch (error) { say(error.message || '搬迁未完成，旧站存档仍然保留。'); window.opener.postMessage({type: 'garden-migration-failed', nonce}, oldOrigin); }
    });
    window.opener.postMessage({type: 'garden-migration-ready', nonce}, oldOrigin);
    say('正在等待旧站传来存档……');
  } else if (location.origin === oldOrigin) {
    button.addEventListener('click', () => {
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
      const child = window.open(`${newOrigin}/migrate.html#${nonce}`, '_blank');
      if (!child) { say('浏览器拦截了新窗口，请允许本站弹出窗口后重试。'); return; }
      button.disabled = true;
      let sending = false;
      const timer = setTimeout(() => { window.removeEventListener('message', onMessage); button.disabled = false; say('转移等待超时。旧站存档仍保留，请检查新站窗口后重试。'); }, 120000);
      const finish = message => { clearTimeout(timer); window.removeEventListener('message', onMessage); button.disabled = false; say(message); };
      async function onMessage(event) {
        if (event.origin !== newOrigin || event.source !== child || event.data?.nonce !== nonce) return;
        if (event.data.type === 'garden-migration-done') { finish('搬迁完成。请在新园窗口继续游玩；旧站存档仍然保留。'); return; }
        if (event.data.type === 'garden-migration-failed') { finish('新站未完成导入，请查看新窗口中的具体原因。旧站存档仍然保留。'); return; }
        if (event.data.type !== 'garden-migration-ready' || sending) return;
        sending = true;
        let db;
        try {
          say('正在读取这个浏览器里的故事与画册……');
          db = await openAlbum();
          const payload = {format: 'daguanyuan-domain-migration-v1', storage: readStorage(), paintings: await readPaintings(db)};
          await validate(payload);
          child.postMessage({type: 'garden-migration-data', nonce, payload}, newOrigin);
          say('已传到新园，正在确认存档写入……');
        } catch (error) { finish(error.message || '读取失败，原存档未改变。'); } finally { db?.close(); }
      }
      window.addEventListener('message', onMessage);
      say('新园窗口已打开，正在连接……');
    });
  } else {
    button.hidden = true;
    say('请使用正式的旧站或新站网址进行存档搬迁。');
  }
})();
