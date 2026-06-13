import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { incidentsApi, type IncidentActivityEntry } from '../../api/incidents';

type IncidentActivityLogProps = {
  incidentId: string;
};

function formatWhen(value: string) {
  return new Date(value).toLocaleString('lv-LV', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function actionLabel(action: IncidentActivityEntry['action']): string | null {
  switch (action) {
    case 'status_changed':
      return 'Statusa maiņa';
    case 'assigned':
      return 'Piešķiršana';
    case 'created':
      return 'Reģistrēts';
    default:
      return null;
  }
}

export function IncidentActivityLog({ incidentId }: IncidentActivityLogProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['incident-activity', incidentId],
    queryFn: () => incidentsApi.listActivity(incidentId),
    enabled: Boolean(incidentId),
    refetchOnMount: 'always',
  });

  const entries = data?.data ?? [];
  const errorMessage =
    error instanceof ApiError
      ? error.displayMessage
      : error instanceof Error
        ? error.message
        : 'Neizdevās ielādēt';

  return (
    <div className="card space-y-3">
      <div>
        <h3 className="font-medium text-gray-800">Darbību žurnāls</h3>
        <p className="text-sm text-gray-500 mt-0.5">Visas izmaiņas un darbības ar šo atgadījumu</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 py-2">Ielādē...</p>
      ) : isError ? (
        <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
          Žurnālu neizdevās ielādēt: {errorMessage}
        </p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">Vēl nav reģistrētu darbību</p>
      ) : (
        <ul className="max-h-64 overflow-y-auto space-y-2 border-t border-gray-100 pt-2">
          {entries.map((entry) => {
            const tag = actionLabel(entry.action);
            return (
              <li key={entry.id} className="text-sm border-b border-gray-100 pb-2 last:border-0">
                {tag && (
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {tag}
                  </span>
                )}
                <p className="text-gray-800 mt-0.5">{entry.description}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatWhen(entry.created_at)}
                  {entry.actor_name ? ` · ${entry.actor_name}` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
