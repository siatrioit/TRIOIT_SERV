import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { unitsApi, type UnitActivityEntry } from '../../api/units';

type UnitActivityLogProps = {
  unitId: string;
  clientId?: string;
  objectId?: string;
};

function formatWhen(value: string) {
  return new Date(value).toLocaleString('lv-LV', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function UnitActivityLog({ unitId, clientId, objectId }: UnitActivityLogProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['unit-activity', unitId, clientId, objectId],
    queryFn: () =>
      clientId && objectId
        ? unitsApi.listActivityForObject(clientId, objectId, unitId)
        : unitsApi.listActivity(unitId),
    enabled: Boolean(unitId),
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
    <div className="border border-gray-100 rounded-xl bg-gray-50/80 p-3">
      <h4 className="text-sm font-medium text-gray-800 mb-2">Darbību žurnāls</h4>
      {isLoading ? (
        <p className="text-sm text-gray-400 py-2">Ielādē...</p>
      ) : isError ? (
        <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
          Žurnālu neizdevās ielādēt: {errorMessage}
        </p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">Vēl nav reģistrētu darbību</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto space-y-2">
          {entries.map((entry: UnitActivityEntry) => (
            <li key={entry.id} className="text-sm border-b border-gray-100 pb-2 last:border-0">
              <p className="text-gray-800">{entry.description}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatWhen(entry.created_at)}
                {entry.actor_name ? ` · ${entry.actor_name}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
