import { useQuery } from '@tanstack/react-query';
import { incidentWorkApi } from '../../api/incidentWork';

type Props = {
  incidentId: string;
};

function formatQty(n: number, unit: string): string {
  const v = Number(n);
  const s = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '');
  return `${s} ${unit}`;
}

/** Materiālu ievade tiks ieslēgta, kad būs gatavs 1. modulis (Noliktava). */
export function IncidentMaterialsSection({ incidentId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['incident-materials', incidentId],
    queryFn: () => incidentWorkApi.listMaterials(incidentId),
  });

  const materials = data?.data ?? [];

  return (
    <section className="card border-gray-200 bg-gray-50/50">
      <div className="mb-3">
        <h3 className="font-medium text-gray-800">Materiāli</h3>
        <p className="text-sm text-gray-500">Izlietotās preces no TRIOIT noliktavas</p>
      </div>

      <div className="bg-amber-50 border border-amber-100 text-amber-900 px-4 py-3 rounded-xl text-sm mb-4 leading-relaxed">
        Pagaidām šeit <strong>nevar ievadīt</strong> materiālus. Kad būs gatavs{' '}
        <strong>1. modulis (Noliktava)</strong>, remontā izlietotās preces tiks norakstītas
        automātiski no noliktavas un parādīsies šajā sarakstā.
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Ielādē...</p>
      ) : materials.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-2">Nav izlietoto materiālu</p>
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id} className="bg-white rounded-xl border border-gray-100 px-3 py-3">
              <p className="font-medium text-gray-900">
                {m.item_name}
                {m.item_sku ? ` (${m.item_sku})` : ''}
              </p>
              <p className="text-sm text-primary-700">
                {formatQty(m.quantity, m.item_unit || 'gab')}
              </p>
              {m.notes && <p className="text-sm text-gray-600 mt-0.5">{m.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
