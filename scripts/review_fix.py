from pathlib import Path
p=Path('src/App.tsx');s=p.read_text(encoding='utf8');needle="<span>{event?'原著情节':person?'人物小传':place?'园景细览':'回目中的园林'}</span>";assert needle in s;s=s.replace(needle,'');p.write_text(s,encoding='utf8')
p=Path('src/styles/garden.css');s=p.read_text(encoding='utf8');s+='\n/* Independent finish review: the heading carries the content identity. */\n.detail-top{justify-content:flex-end;padding-top:10px}.detail-scroll{padding-top:4px}@media(max-width:600px){.detail-top{padding-top:0}.detail-scroll{padding-top:0}}\n';p.write_text(s,encoding='utf8')
