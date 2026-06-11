import { useEffect, useState } from 'react';
import { APP_VERSION_LABEL } from '../version';

function readMetaVersion(): string | null {
  const meta = document.querySelector('meta[name="app-version"]');
  const v = meta?.getAttribute('content')?.trim();
  return v ? `v${v}` : null;
}

/** Versija no index.html meta, /health vai /app-version.json — ne tikai no kešota JS bundle */
export function useAppVersionLabel(): string {
  const [label, setLabel] = useState(() => readMetaVersion() || APP_VERSION_LABEL);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/health', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { version?: string };
          if (!cancelled && data.version) {
            setLabel(`v${data.version}`);
            return;
          }
        }
      } catch {
        /* offline vai nav API */
      }

      try {
        const res = await fetch(`/app-version.json?_=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { version?: string };
          if (!cancelled && data.version) setLabel(`v${data.version}`);
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return label;
}
