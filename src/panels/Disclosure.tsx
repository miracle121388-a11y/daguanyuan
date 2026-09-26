import {useEffect, useRef, type ReactNode} from 'react';

/** Native disclosure keeps secondary actions out of the tab order until opened. */
export default function Disclosure({label, children, className = ''}: {label: ReactNode; children: ReactNode; className?: string}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false;
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  return <details ref={ref} className={'action-disclosure ' + className} onKeyDown={event => {
    if (event.key === 'Escape' && ref.current?.open) {
      event.preventDefault(); event.stopPropagation(); ref.current.open = false;
      ref.current.querySelector('summary')?.focus();
    }
  }}>
    <summary>{label}</summary>
    <div className="disclosure-content" onClick={event => {
      if ((event.target as Element).closest('button:not(:disabled), a') && ref.current) {
        ref.current.open = false;
        ref.current.querySelector('summary')?.focus({preventScroll: true});
      }
    }}>{children}</div>
  </details>;
}
