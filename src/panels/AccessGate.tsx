import {useEffect, useState} from 'react';
import {useSimulation} from '../simulation/store';
import {rememberAccess, verifyAccess} from '../simulation/access';

export default function AccessGate() {
  const token = useSimulation(s => s.accessToken);
  const [draft, setDraft] = useState(''), [editing, setEditing] = useState(false);
  const [verified, setVerified] = useState(false), [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setVerified(false);
    if (!token) return;
    const abort = new AbortController();
    verifyAccess(token, abort.signal).then(() => setVerified(true)).catch(error => {
      if (!abort.signal.aborted) { setNotice(error.message); setEditing(true); }
    });
    return () => abort.abort();
  }, [token]);
  const unlock = async () => {
    if (!draft.trim() || checking) return;
    setChecking(true); setNotice('');
    try {
      const value = draft.trim(); await verifyAccess(value);
      const saved = rememberAccess(value);
      useSimulation.setState({accessToken: value, error: ''});
      setVerified(true); setEditing(false); setDraft('');
      setNotice(saved ? '' : '浏览器禁止保存口令，本次打开期间仍可使用。');
    } catch (error) { setNotice(error instanceof Error ? error.message : '口令验证失败，请重试。'); }
    finally { setChecking(false); }
  };
  return <div className="workspace-access">
    {verified && !editing ? <div className="access-unlocked"><span>已解锁</span><small>推演、互动、作画共用口令</small><button onClick={() => setEditing(true)}>更换</button><button onClick={() => {rememberAccess(''); useSimulation.setState({accessToken: ''}); setNotice('');}}>退出</button></div>
      : <form onSubmit={e => {e.preventDefault(); void unlock();}}><label htmlFor="garden-access">访问口令</label><input id="garden-access" type="password" autoComplete="current-password" value={draft} onChange={e => setDraft(e.target.value)} placeholder="首次填写，本机记住" disabled={checking}/><button disabled={checking || !draft.trim()}>{checking ? '验证中…' : '解锁'}</button>{editing && verified && <button type="button" onClick={() => {setEditing(false); setNotice('');}}>取消</button>}</form>}
    {notice && <small className="access-notice" role="alert">{notice}</small>}
  </div>;
}
