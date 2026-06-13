import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { clientsApi } from '../../api/clients';
import {
  warehouseCommercialApi,
  type WarehouseReceipt,
} from '../../api/warehouseCommercial';
import { Modal } from '../../components/ui/Modal';

function flag(v: unknown) {
  return v === true || v === 1 || v === '1';
}

type LineDraft = { product_id: string; quantity: string; unit_price: string };

const emptyLine = (): LineDraft => ({ product_id: '', quantity: '1', unit_price: '' });

export function WarehouseReceiptsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<WarehouseReceipt | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['warehouse-receipts'],
    queryFn: () => warehouseCommercialApi.listReceipts(),
  });

  const receipts = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['warehouse-receipts'] });

  const handlePost = async (id: string) => {
    setPostingId(id);
    try {
      await warehouseCommercialApi.postReceipt(id);
      invalidate();
      if (detail?.id === id) {
        const res = await warehouseCommercialApi.getReceipt(id);
        setDetail(res.data);
      }
    } catch (e) {
      alert(e instanceof ApiError ? e.displayMessage : 'Grāmatošana neizdevās');
    } finally {
      setPostingId(null);
    }
  };

  const openDetail = async (r: WarehouseReceipt) => {
    try {
      const res = await warehouseCommercialApi.getReceipt(r.id);
      setDetail(res.data);
    } catch {
      setDetail(r);
    }
  };

  const statusLabel = (s: WarehouseReceipt['status']) => {
    if (s === 'posted') return 'Grāmatots';
    if (s === 'cancelled') return 'Atcelts';
    return 'Melnraksts';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          className="btn-primary !py-2 !px-4 !min-h-0 text-sm"
          onClick={() => setCreateOpen(true)}
        >
          + Jauna saņemšana
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Ielādē...</p>
      ) : receipts.length === 0 ? (
        <p className="text-sm text-gray-500 card py-6 text-center">Nav pavadzīmju</p>
      ) : (
        <ul className="space-y-2">
          {receipts.map((r) => (
            <li key={r.id} className="card">
              <button type="button" className="w-full text-left" onClick={() => openDetail(r)}>
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{r.document_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.supplier_name} · {r.document_date}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-lg h-fit ${
                      r.status === 'posted'
                        ? 'bg-green-50 text-green-800'
                        : r.status === 'cancelled'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {statusLabel(r.status)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {createOpen && (
        <ReceiptCreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            invalidate();
          }}
        />
      )}

      {detail && (
        <Modal
          open
          title={detail.document_number}
          onClose={() => setDetail(null)}
          footer={
            detail.status === 'draft' ? (
              <button
                type="button"
                className="btn-primary"
                disabled={postingId === detail.id}
                onClick={() => handlePost(detail.id)}
              >
                {postingId === detail.id ? 'Grāmato...' : 'Grāmatot'}
              </button>
            ) : undefined
          }
        >
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-gray-500">Piegādātājs:</span> {detail.supplier_name}
            </p>
            <p>
              <span className="text-gray-500">Datums:</span> {detail.document_date}
            </p>
            <p>
              <span className="text-gray-500">Statuss:</span> {statusLabel(detail.status)}
            </p>
            {detail.notes && (
              <p>
                <span className="text-gray-500">Piezīmes:</span> {detail.notes}
              </p>
            )}
            {detail.lines && detail.lines.length > 0 && (
              <ul className="border border-gray-100 rounded-xl divide-y divide-gray-100">
                {detail.lines.map((l) => (
                  <li key={l.id} className="px-3 py-2 flex justify-between gap-2">
                    <span>{l.product_name}</span>
                    <span className="text-gray-600 whitespace-nowrap">
                      {l.quantity}
                      {l.unit_price != null ? ` × ${l.unit_price}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function ReceiptCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [supplierId, setSupplierId] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: clientsData } = useQuery({
    queryKey: ['warehouse-suppliers'],
    queryFn: () => clientsApi.list({ warehouse: '1', limit: '500' }),
  });
  const { data: productsData } = useQuery({
    queryKey: ['warehouse-products-all'],
    queryFn: () => warehouseCommercialApi.listProducts(),
  });

  const suppliers = (clientsData?.data ?? []).filter((c) => flag(c.is_supplier));
  const products = productsData?.data ?? [];

  const updateLine = (idx: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const handleSave = async () => {
    if (!supplierId) {
      setError('Izvēlieties piegādātāju');
      return;
    }
    const validLines = lines
      .filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({
        product_id: l.product_id,
        quantity: Number(l.quantity),
        unit_price: l.unit_price ? Number(l.unit_price) : null,
      }));
    if (validLines.length === 0) {
      setError('Pievienojiet vismaz vienu preci');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await warehouseCommercialApi.createReceipt({
        supplier_id: supplierId,
        document_date: documentDate,
        notes: notes.trim() || undefined,
        lines: validLines,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.displayMessage : 'Neizdevās izveidot');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title="Jauna saņemšanas pavadzīme"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Atcelt
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saglabā...' : 'Saglabāt melnrakstu'}
          </button>
        </>
      }
    >
      {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl mb-3">{error}</div>}
      <div className="space-y-3">
        <select className="input-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">Piegādātājs *</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          className="input-field"
          type="date"
          value={documentDate}
          onChange={(e) => setDocumentDate(e.target.value)}
        />
        <textarea
          className="input-field min-h-[60px]"
          placeholder="Piezīmes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Preces</p>
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <select
                className="input-field col-span-6"
                value={line.product_id}
                onChange={(e) => updateLine(idx, { product_id: e.target.value })}
              >
                <option value="">Prece</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                className="input-field col-span-3"
                type="number"
                min="0"
                step="0.001"
                placeholder="Daudz."
                value={line.quantity}
                onChange={(e) => updateLine(idx, { quantity: e.target.value })}
              />
              <input
                className="input-field col-span-3"
                type="number"
                step="0.01"
                placeholder="Cena"
                value={line.unit_price}
                onChange={(e) => updateLine(idx, { unit_price: e.target.value })}
              />
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary-600 font-medium"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            + Rinda
          </button>
        </div>
      </div>
    </Modal>
  );
}
