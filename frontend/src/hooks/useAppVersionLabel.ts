import { useEffect, useState } from 'react';
import { APP_VERSION_LABEL } from '../version';

/** Rāda versiju no /health (servera), ja pieejama — citādi no build laika */
export function useAppVersionLabel(): string {
  const [label, setLabel] = useState(APP_VERSION_LABEL);

  useEffect(() => {
    fetch('/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { version?: string } | null) => {
        if (data?.version) setLabel(`v${data.version}`);
      })
      .catch(() => {});
  }, []);

  return label;
}
