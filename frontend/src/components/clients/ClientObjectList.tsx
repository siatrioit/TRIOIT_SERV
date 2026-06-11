import type { ClientObjectInput } from '../../api/clients';

type ClientObjectListProps = {
  objects: ClientObjectInput[];
  closedObjects?: ClientObjectInput[];
  onOpen: (object: ClientObjectInput) => void;
  onOpenClosed?: (object: ClientObjectInput) => void;
  onAdd: () => void;
  disabled?: boolean;
};

function objectSubtitle(obj: ClientObjectInput): string {
  const parts = [obj.city, obj.address].filter(Boolean);
  if (obj.object_code) parts.unshift(`#${obj.object_code}`);
  return parts.join(' · ') || 'Nav adreses';
}

function ObjectRow({
  obj,
  onClick,
  closed,
}: {
  obj: ClientObjectInput;
  onClick: () => void;
  closed?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-3 py-3 rounded-xl transition-colors flex items-center gap-3 group ${
          closed
            ? 'hover:bg-gray-50 active:bg-gray-100 opacity-80'
            : 'hover:bg-gray-50 active:bg-gray-100'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium truncate ${closed ? 'text-gray-600' : 'text-gray-900'}`}>
              {obj.name}
            </span>
            {obj.is_primary && !closed && (
              <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-md shrink-0">
                galvenais
              </span>
            )}
            {closed && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md shrink-0">
                slēgts
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
  );
}

export function ClientObjectList({
  objects,
  closedObjects = [],
  onOpen,
  onOpenClosed,
  onAdd,
  disabled,
}: ClientObjectListProps) {
  return (
    <div className="space-y-6">
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
              <ObjectRow key={obj.id || obj.name} obj={obj} onClick={() => onOpen(obj)} />
            ))}
          </ul>
        )}
      </section>

      {closedObjects.length > 0 && (
        <section className="card border-gray-200 bg-gray-50/50">
          <div className="mb-4">
            <h3 className="font-medium text-gray-600">Slēgtie objekti</h3>
            <p className="text-sm text-gray-500">
              {closedObjects.length} slēgts objekts
              {closedObjects.length === 1 ? '' : 'i'}
            </p>
          </div>
          <ul className="divide-y divide-gray-200 -mx-1">
            {closedObjects.map((obj) => (
              <ObjectRow
                key={obj.id || obj.name}
                obj={obj}
                closed
                onClick={() => (onOpenClosed ?? onOpen)(obj)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
