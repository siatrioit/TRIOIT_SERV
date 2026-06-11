import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { incidentWorkApi } from '../../api/incidentWork';
import { warehouseApi, type WarehouseItem } from '../../api/warehouse';
import { Modal } from '../ui/Modal';

type Props = {
  incidentId: string;
  canEdit: boolean;
  incidentClosed: boolean;
};

function formatQty(n: number, unit: string): string {
  const v = Number(n);
  const s = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '');
  return `${s} ${unit}`;
}

export function IncidentMaterialsSection({ incidentId, canEdit, incidentClosed }: Props) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['incident-materials', incidentId],
    queryFn: () => incidentWorkApi.listMaterials(incidentId),
  });

  const { data: stockData } = useQuery({
    queryKey: ['warehouse', 'picker'],
    queryFn: () => warehouseApi.list(),
    enabled: modalOpen,
  });

  const materials = data?.data ?? [];
  const stockItems = (stockData?.data ?? []).filter((i) => Number(i.quantity_on_hand) > 0);

  const selectedItem: WarehouseItem | undefined = stockItems.find((i) => i.id === itemId);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['incident-materials', incidentId] });
    queryClient.invalidateQueries({ queryKey: ['warehouse'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => incidentWorkApi.deleteMaterial(incidentId, id),
    onSuccess: invalidate,
  });

  const openAdd = () => {
    setItemId('');
    setQuantity('1');
    setNotes('');
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    const qty = parseFloat(quantity);
    if (!itemId) {
      setError('Izvēlieties materiālu');
      return;
    }
    if (!qty || qty <= 0) {
      setError('Norādiet daudzumu');
      return;
    }
    if (selectedItem && qty > Number(selectedItem.quantity_on_hand)) {
      setError(`Noliktavā tikai ${formatQty(selectedItem.quantity_on_hand, selectedItem.unit)}`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await incidentWorkApi.addMaterial(incidentId, {
        warehouse_item_id: itemId,
        quantity: qty,
        notes: notes.trim() || undefined,
      });
      invalidate();
      setModalOpen(false);
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

  const readOnly = incidentClosed || !canEdit;

  return (
    <section className="card border-gray-200 bg-gray-50/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h3 className="font-medium text-gray-800">Materiāli</h3>
          <p className="text-sm text-gray-500">
            No noliktavas — automātiski samazina atlikumu
          </p>
        </div>
        {!readOnly && (
          <button type="button" className="btn-secondary !py-2 !px-4 !min-h-0 text-sm" onClick={openAdd}>
            + Pievienot
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Ielādē...</p>
      ) : materials.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Nav izlietoto materiālu</p>
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id} className="bg-white rounded-xl border border-gray-100 px-3 py-3">
              <div className="flex justify-between gap-2 items-start">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {m.item_name}
                    {m.item_sku ? ` (${m.item_sku})` : ''}
                  </p>
                  <p className="text-sm text-primary-700">
                    {formatQty(m.quantity, m.item_unit || 'gab')}
                  </p>
                  {m.notes && <p className="text-sm text-gray-600 mt-0.5">{m.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(m.used_at).toLocaleString('lv-LV')}
                    {m.used_by_name ? ` · ${m.used_by_name}` : ''}
                  </p>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    className="text-xs text-red-600 shrink-0 px-2 py-1"
                    onClick={() => {
                      if (confirm('Noņemt materiālu un atgriezt noliktavā?')) {
                        deleteMutation.mutate(m.id);
                      }
                    }}
                  >
                    Noņemt
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        title="Materiāls no noliktavas"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setModalOpen(false)}>
              Atcelt
            </button>
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving}>
              {saving ? 'Saglabā...' : 'Norakstīt'}
            </button>
          </>
        }
      >
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}
        {stockItems.length === 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-xl">
            Noliktavā nav materiālu ar pozitīvu atlikumu. Pievienojiet materiālus sadaļā Noliktava.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Materiāls *</label>
              <select
                className="input-field"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
              >
                <option value="">Izvēlieties...</option>
                {stockItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.sku ? ` · ${item.sku}` : ''} — {formatQty(item.quantity_on_hand, item.unit)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Daudzums{selectedItem ? ` (${selectedItem.unit})` : ''} *
              </label>
              <input
                type="number"
                min={0.001}
                step="any"
                className="input-field"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Piezīme</label>
              <input
                className="input-field"
                placeholder="piem. kur uzstādīts"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
