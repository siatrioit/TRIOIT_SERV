import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  isProductService,
  warehouseCommercialApi,
  type WarehouseProduct,
} from '../../api/warehouseCommercial';

function movementLabel(type: string, referenceType?: string | null) {
  if (type === 'in' || referenceType === 'receipt') return 'Saņemšana';
  if (type === 'out' || referenceType === 'issue') return 'Izrakstīšana';
  return 'Korekcija';
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('lv-LV', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  active?: boolean;
};

export function WarehouseProductJournalPanel({ active = true }: Props) {
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['warehouse-products-journal', search],
    queryFn: () => warehouseCommercialApi.listProducts({ search: search || undefined }),
    enabled: active,
  });

  const movementProductId = selectedProductId || productFilter || undefined;

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ['warehouse-journal-movements', movementProductId],
    queryFn: () =>
      warehouseCommercialApi.listProductMovements({
        product_id: movementProductId,
        limit: 500,
      }),
    enabled: active,
  });

  const products = productsData?.data ?? [];
  const movements = movementsData?.data ?? [];

  const stockProducts = useMemo(
    () => products.filter((p) => !isProductService(p)),
    [products]
  );

  const lowStockCount = useMemo(
    () =>
      stockProducts.filter(
        (p) => p.min_quantity != null && Number(p.quantity_on_hand) <= Number(p.min_quantity)
      ).length,
    [stockProducts]
  );

  const handleProductClick = (p: WarehouseProduct) => {
    setSelectedProductId((prev) => (prev === p.id ? null : p.id));
    setProductFilter('');
  };

  return (
    <div className="space-y-6 pt-2">
      <p className="text-sm text-gray-500">
        Preču atlikumi un kustību vēsture. Pakalpojumiem atlikums netiek uzskaitīts, bet kustības
        pavadzīmēs tiek fiksētas.
      </p>

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <h4 className="font-medium text-gray-800">Preču atlikumi</h4>
          {lowStockCount > 0 && (
            <span className="text-xs bg-amber-50 text-amber-800 px-2 py-1 rounded-lg">
              {lowStockCount} preces ar zemu atlikumu
            </span>
          )}
        </div>

        <input
          className="input-field"
          placeholder="Meklēt preci..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {productsLoading ? (
          <p className="text-sm text-gray-400">Ielādē...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center rounded-xl bg-gray-50">Nav preču</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600">
                  <th className="px-3 py-2 font-medium">Prece</th>
                  <th className="px-3 py-2 font-medium">Tips</th>
                  <th className="px-3 py-2 font-medium">Grupa</th>
                  <th className="px-3 py-2 font-medium text-right">Atlikums</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isService = isProductService(p);
                  const selected = selectedProductId === p.id;
                  const low =
                    !isService &&
                    p.min_quantity != null &&
                    Number(p.quantity_on_hand) <= Number(p.min_quantity);
                  return (
                    <tr
                      key={p.id}
                      className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selected ? 'bg-primary-50' : ''
                      }`}
                      onClick={() => handleProductClick(p)}
                    >
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        {p.sku && <p className="text-xs text-gray-500">{p.sku}</p>}
                      </td>
                      <td className="px-3 py-2">
                        {isService ? (
                          <span className="text-xs bg-violet-50 text-violet-800 px-2 py-0.5 rounded-full">
                            Pakalpojums
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Prece</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{p.group_path || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {isService ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <span className={low ? 'text-amber-700 font-medium' : 'text-gray-900'}>
                            {p.quantity_on_hand} {p.unit}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {selectedProductId && (
          <p className="text-xs text-gray-500">
            Filtrēts pēc preces.{' '}
            <button
              type="button"
              className="text-primary-600 font-medium"
              onClick={() => setSelectedProductId(null)}
            >
              Rādīt visas kustības
            </button>
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <h4 className="font-medium text-gray-800">Kustību žurnāls</h4>
          <select
            className="input-field sm:w-64"
            value={productFilter}
            onChange={(e) => {
              setProductFilter(e.target.value);
              setSelectedProductId(null);
            }}
          >
            <option value="">Visas preces</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {movementsLoading ? (
          <p className="text-sm text-gray-400">Ielādē...</p>
        ) : movements.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center rounded-xl bg-gray-50">Nav kustību</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600">
                  <th className="px-3 py-2 font-medium">Datums</th>
                  <th className="px-3 py-2 font-medium">Prece</th>
                  <th className="px-3 py-2 font-medium">Operācija</th>
                  <th className="px-3 py-2 font-medium">Dokuments</th>
                  <th className="px-3 py-2 font-medium text-right">Daudzums</th>
                  <th className="px-3 py-2 font-medium text-right">Atlikums pēc</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const isService = isProductService(m);
                  const sign = m.movement_type === 'out' ? '−' : '+';
                  return (
                    <tr key={m.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-gray-900">{m.product_name}</p>
                        {isService && (
                          <span className="text-xs text-violet-700">Pakalpojums</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            m.movement_type === 'in'
                              ? 'bg-green-50 text-green-800'
                              : m.movement_type === 'out'
                                ? 'bg-blue-50 text-blue-800'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {movementLabel(m.movement_type, m.reference_type)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {m.reference_number || m.notes || '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {sign}
                        {m.quantity} {m.product_unit}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {isService ? '—' : `${m.quantity_after} ${m.product_unit}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function WarehouseProductJournalCollapsible() {
  const [open, setOpen] = useState(false);

  return (
    <section className="card !p-0 overflow-hidden">
      <button
        type="button"
        className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors ${
          open ? 'bg-primary-50/60 border-b border-primary-100' : 'hover:bg-gray-50'
        }`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
            open ? 'bg-primary-100' : 'bg-gray-100'
          }`}
          aria-hidden
        >
          📊
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-medium text-gray-900">Preču žurnāls</span>
          <span className="block text-xs text-gray-500 mt-0.5">
            Atlikumi un kustību vēsture — atveriet, ja nepieciešams
          </span>
        </span>
        <span
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-4 pb-5 pt-1 border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
          <WarehouseProductJournalPanel active={open} />
        </div>
      )}
    </section>
  );
}
