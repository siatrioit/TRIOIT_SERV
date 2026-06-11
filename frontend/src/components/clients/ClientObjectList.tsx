import type { ClientObjectInput } from '../../api/clients';

type ClientObjectListProps = {
  objects: ClientObjectInput[];
  onOpen: (object: ClientObjectInput) => void;
  onAdd: () => void;
  disabled?: boolean;
};

function objectSubtitle(obj: ClientObjectInput): string {
  const parts = [obj.city, obj.address].filter(Boolean);
  if (obj.object_code) parts.unshift(`#${obj.object_code}`);
  return parts.join(' · ') || 'Nav adreses';
}

export function ClientObjectList({ objects, onOpen, onAdd, disabled }: ClientObjectListProps) {
  return (
    <section className="card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-medium text-gray-800">Objekti</h3>
          <p className="text-sm text-gray-500">
            {objects.length === 0
              ? 'Nav pievienotu objektu'
              : `${objects.length} objekts${objects.length === 1 ? '' : 'i'}`}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary !py-2 !px-4 !min-h-0 text-sm w-full sm:w-auto shrink-0"
          onClick={onAdd}
          disabled={disabled}
        >
          + Jauns objekts
        </button>
      </div>

      {objects.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-200 rounded-xl">
          Pievieno pirmo apkalpojamo objektu (veikalu, biroju u.c.)
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 -mx-1">
          {objects.map((obj) => (
            <li key={obj.id || obj.name}>
              <button
                type="button"
                onClick={() => onOpen(obj)}
                className="w-full text-left px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 truncate">{obj.name}</span>
                    {obj.is_primary && (
                      <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-md shrink-0">
                        galvenais
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{objectSubtitle(obj)}</p>
                  {obj.contact_phone && (
                    <p className="text-xs text-gray-400 mt-0.5">{obj.contact_phone}</p>
                  )}
                </div>
                <span className="text-gray-400 group-hover:text-primary-600 shrink-0" aria-hidden>
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
