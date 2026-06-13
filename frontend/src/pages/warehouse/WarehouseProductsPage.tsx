import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { warehouseCommercialApi, type WarehouseProduct } from '../../api/warehouseCommercial';
import { Modal } from '../../components/ui/Modal';

export function WarehouseProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [productModal, setProductModal] = useState<{ open: boolean; initial?: WarehouseProduct | null }>({
    open: false,
  });
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');

  const { data: groupsData } = useQuery({
    queryKey: ['warehouse-groups'],
    queryFn: () => warehouseCommercialApi.listGroups(),
  });
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['warehouse-products', search, groupFilter],
    queryFn: () =>
      warehouseCommercialApi.listProducts({
        search: search || undefined,
        group_id: groupFilter || undefined,
      }),
  });

  const groups = groupsData?.data ?? [];
  const products = productsData?.data ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['warehouse-groups'] });
    queryClient.invalidateQueries({ queryKey: ['warehouse-products'] });
  };

  const addGroup = useMutation({
    mutationFn: () => warehouseCommercialApi.createGroup({ name: groupName.trim() }),
    onSuccess: () => {
      setGroupName('');
      invalidate();
    },
    onError: (e) => setError(e instanceof ApiError ? e.displayMessage : 'Kļūda'),
  });

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <h3 className="font-medium text-gray-800">Preču grupas</h3>
        <div className="flex gap-2 flex-wrap">
          <input
            className="input-field flex-1 min-w-[200px]"
            placeholder="Jaunas grupas nosaukums"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary !py-2 !px-4 !min-h-0"
            disabled={!groupName.trim() || addGroup.isPending}
            onClick={() => addGroup.mutate()}
          >
            + Grupa
          </button>
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-500">Nav grupu</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <span
                key={g.id}
                className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
              >
                {g.name} ({g.product_count ?? 0})
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <h3 className="font-medium text-gray-800">Preces</h3>
          <button
            type="button"
            className="btn-primary !py-2 !px-4 !min-h-0 text-sm"
            onClick={() => setProductModal({ open: true, initial: null })}
          >
            + Jauna prece
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="input-field flex-1"
            placeholder="Meklēt preci..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input-field sm:w-48"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">Visas grupas</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl">{error}</div>}

        {isLoading ? (
          <p className="text-sm text-gray-400">Ielādē...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-500 card py-6 text-center">Nav preču</p>
        ) : (
          <ul className="space-y-2">
            {products.map((p) => (
              <li key={p.id} className="card flex justify-between gap-3 items-start">
                <button
                  type="button"
                  className="text-left flex-1"
                  onClick={() => setProductModal({ open: true, initial: p })}
                >
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.group_name || 'Bez grupas'}
                    {p.sku ? ` · ${p.sku}` : ''}
                    {` · Atlikums: ${p.quantity_on_hand} ${p.unit}`}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {productModal.open && (
        <ProductModal
          groups={groups}
          initial={productModal.initial}
          onClose={() => setProductModal({ open: false })}
          onSaved={() => {
            setProductModal({ open: false });
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function ProductModal({
  groups,
  initial,
  onClose,
  onSaved,
}: {
  groups: { id: string; name: string }[];
  initial?: WarehouseProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [groupId, setGroupId] = useState(initial?.group_id ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? 'gab');
  const [purchasePrice, setPurchasePrice] = useState(
    initial?.purchase_price != null ? String(initial.purchase_price) : ''
  );
  const [salePrice, setSalePrice] = useState(
    initial?.sale_price != null ? String(initial.sale_price) : ''
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nosaukums ir obligāts');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        group_id: groupId || null,
        unit: unit.trim() || 'gab',
        purchase_price: purchasePrice ? Number(purchasePrice) : null,
        sale_price: salePrice ? Number(salePrice) : null,
      };
      if (initial) {
        await warehouseCommercialApi.updateProduct(initial.id, payload);
      } else {
        await warehouseCommercialApi.createProduct(payload);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.displayMessage : 'Saglabāšana neizdevās');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={initial ? 'Prece' : 'Jauna prece'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Atcelt
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saglabā...' : 'Saglabāt'}
          </button>
        </>
      }
    >
      {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl mb-3">{error}</div>}
      <div className="space-y-3">
        <input className="input-field" placeholder="Nosaukums *" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input-field" placeholder="Artikuls / SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
        <select className="input-field" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Bez grupas</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <input className="input-field" placeholder="Mērvienība" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input
            className="input-field"
            placeholder="Iepirkuma cena"
            type="number"
            step="0.01"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Pārdošanas cena"
            type="number"
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
