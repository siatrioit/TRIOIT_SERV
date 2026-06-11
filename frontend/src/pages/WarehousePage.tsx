import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { warehouseApi, type WarehouseItem, type WarehouseItemInput } from '../api/warehouse';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';

function formatQty(n: number, unit: string): string {
  const v = Number(n);
  const s = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '');
  return `${s} ${unit}`;
}

function isLowStock(item: WarehouseItem): boolean {
  if (item.min_quantity == null) return false;
  return Number(item.quantity_on_hand) <= Number(item.min_quantity);
}

type ItemModalProps = {
  open: boolean;
  initial?: WarehouseItem | null;
  onClose: () => void;
  onSave: (data: WarehouseItemInput) => Promise<void>;
};

function ItemModal({ open, initial, onClose, onSave }: ItemModalProps) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('gab');
  const [minQuantity, setMinQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSku(initial?.sku || '');
    setName(initial?.name || '');
    setDescription(initial?.description || '');
    setUnit(initial?.unit || 'gab');
    setMinQuantity(initial?.min_quantity != null ? String(initial.min_quantity) : '');
    setError('');
  }, [open, initial]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nosaukums ir obligāts');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        sku: sku.trim() || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        unit: unit.trim() || 'gab',
        min_quantity: minQuantity.trim() ? parseFloat(minQuantity) : undefined,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Saglabāšana neizdevās'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={initial ? 'Materiāls' : 'Jauns materiāls'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            Atcelt
          </button>
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving}>
            {saving ? 'Saglabā...' : 'Saglabāt'}
          </button>
        </>
      }
    >
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
      )}
      <div className="space-y-3">
        <input className="input-field" placeholder="Artikula kods / SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
        <input className="input-field" placeholder="Nosaukums *" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input-field" placeholder="Mērvienība (gab, m, kg...)" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <input
          type="number"
          min={0}
          step="any"
          className="input-field"
          placeholder="Min. atlikums (brīdinājumam)"
          value={minQuantity}
          onChange={(e) => setMinQuantity(e.target.value)}
        />
        <textarea
          className="input-field min-h-[80px]"
          placeholder="Apraksts"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
    </Modal>
  );
}

type StockInModalProps = {
  open: boolean;
  item: WarehouseItem | null;
  onClose: () => void;
  onSave: (quantity: number, notes?: string) => Promise<void>;
};

function StockInModal({ open, item, onClose, onSave }: StockInModalProps) {
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuantity('1');
    setNotes('');
    setError('');
  }, [open, item?.id]);

  const handleSave = async () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError('Norādiet daudzumu');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(qty, notes.trim() || undefined);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Neizdevās'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Modal
      open={open}
      title={`Saņemt: ${item.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            Atcelt
          </button>
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving}>
            {saving ? 'Saglabā...' : 'Pievienot noliktavā'}
          </button>
        </>
      }
    >
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
      )}
      <p className="text-sm text-gray-500 mb-3">
        Pašreizējais atlikums: {formatQty(item.quantity_on_hand, item.unit)}
      </p>
      <div className="space-y-3">
        <input
          type="number"
          min={0.001}
          step="any"
          className="input-field"
          placeholder={`Daudzums (${item.unit})`}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Piezīme (piem. piegāde, rēķins)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}

export function WarehousePage() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === 'admin' || role === 'manager' || role === 'technician';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [itemModal, setItemModal] = useState<{ open: boolean; item?: WarehouseItem | null }>({
    open: false,
  });
  const [stockModal, setStockModal] = useState<{ open: boolean; item: WarehouseItem | null }>({
    open: false,
    item: null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['warehouse', search],
    queryFn: () => warehouseApi.list(search || undefined),
  });

  const items = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['warehouse'] });

  const createMutation = useMutation({
    mutationFn: (payload: WarehouseItemInput) => warehouseApi.create(payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WarehouseItemInput }) =>
      warehouseApi.update(id, payload),
    onSuccess: invalidate,
  });

  const stockInMutation = useMutation({
    mutationFn: ({ id, quantity, notes }: { id: string; quantity: number; notes?: string }) =>
      warehouseApi.stockIn(id, { quantity, notes }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Noliktava</h2>
          <p className="text-sm text-gray-500">Materiāli remontam un uzstādīšanai</p>
        </div>
        {canEdit && (
          <button
            type="button"
            className="btn-primary !py-2 !px-4 !min-h-0 text-sm"
            onClick={() => setItemModal({ open: true, item: null })}
          >
            + Jauns
          </button>
        )}
      </div>

      <input
        className="input-field"
        placeholder="Meklēt pēc nosaukuma, SKU..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Ielādē...</div>
      ) : items.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">
          Nav materiālu.
          {canEdit && ' Pievienojiet pirmo pozīciju.'}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`card ${isLowStock(item) ? 'border-amber-300 bg-amber-50/40' : ''}`}
            >
              <div className="flex justify-between gap-3 items-start">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  {item.sku && <p className="text-xs text-gray-400">{item.sku}</p>}
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  )}
                  <p className={`text-lg font-semibold mt-2 ${isLowStock(item) ? 'text-amber-700' : 'text-primary-700'}`}>
                    {formatQty(item.quantity_on_hand, item.unit)}
                  </p>
                  {isLowStock(item) && (
                    <p className="text-xs text-amber-700 mt-0.5">Zems atlikums</p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      className="text-sm text-primary-600 font-medium px-2 py-1"
                      onClick={() => setStockModal({ open: true, item })}
                    >
                      + Saņemt
                    </button>
                    <button
                      type="button"
                      className="text-sm text-gray-600 px-2 py-1"
                      onClick={() => setItemModal({ open: true, item })}
                    >
                      Labot
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ItemModal
        open={itemModal.open}
        initial={itemModal.item}
        onClose={() => setItemModal({ open: false })}
        onSave={async (payload) => {
          if (itemModal.item?.id) {
            await updateMutation.mutateAsync({ id: itemModal.item.id, payload });
          } else {
            await createMutation.mutateAsync(payload);
          }
        }}
      />

      <StockInModal
        open={stockModal.open}
        item={stockModal.item}
        onClose={() => setStockModal({ open: false, item: null })}
        onSave={async (quantity, notes) => {
          if (!stockModal.item) return;
          await stockInMutation.mutateAsync({
            id: stockModal.item.id,
            quantity,
            notes,
          });
        }}
      />
    </div>
  );
}
