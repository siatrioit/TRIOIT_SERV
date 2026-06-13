import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { clientsApi } from '../../api/clients';
import {
  isProductService,
  warehouseCommercialApi,
  type WarehouseIssue,
  type WaybillLine,
} from '../../api/warehouseCommercial';
import { Modal } from '../../components/ui/Modal';

function flag(v: unknown) {
  return v === true || v === 1 || v === '1';
}

type LineDraft = { product_id: string; quantity: string; unit_price: string };

const emptyLine = (): LineDraft => ({ product_id: '', quantity: '1', unit_price: '' });

function formatMoney(value: number) {
  return value.toLocaleString('lv-LV', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function lineTotal(line: WaybillLine) {
  if (line.unit_price == null) return null;
  return Number(line.quantity) * Number(line.unit_price);
}

export function WarehouseIssuesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<WarehouseIssue | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['warehouse-issues'],
    queryFn: () => warehouseCommercialApi.listIssues(),
  });

  const issues = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['warehouse-issues'] });

  const handlePost = async (id: string) => {
    setPostingId(id);
    try {
      await warehouseCommercialApi.postIssue(id);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['warehouse-products'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-products-all'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-journal-movements'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-products-journal'] });
      if (detail?.id === id) {
        const res = await warehouseCommercialApi.getIssue(id);
        setDetail(res.data);
      }
    } catch (e) {
      alert(e instanceof ApiError ? e.displayMessage : 'Grāmatošana neizdevās');
    } finally {
      setPostingId(null);
    }
  };

  const openDetail = async (r: WarehouseIssue) => {
    try {
      const res = await warehouseCommercialApi.getIssue(r.id);
      setDetail(res.data);
    } catch {
      setDetail(r);
    }
  };

  const statusLabel = (s: WarehouseIssue['status']) => {
    if (s === 'posted') return 'Grāmatots';
    if (s === 'cancelled') return 'Atcelts';
    return 'Melnraksts';
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Izrakstīšanas žurnāls — preču izsniegšana no noliktavas pircējam. Grāmatojot pavadzīmi,
        atlikums tiek samazināts (izņemot pakalpojumus).
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          className="btn-primary !py-2 !px-4 !min-h-0 text-sm"
          onClick={() => setCreateOpen(true)}
        >
          + Jauna izrakstīšana
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Ielādē...</p>
      ) : issues.length === 0 ? (
        <p className="text-sm text-gray-500 card py-6 text-center">Nav pavadzīmju</p>
      ) : (
        <ul className="space-y-2">
          {issues.map((r) => (
            <li key={r.id} className="card">
              <button type="button" className="w-full text-left" onClick={() => openDetail(r)}>
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{r.document_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.buyer_name}
                      {r.buyer_document_number ? ` · ${r.buyer_document_number}` : ''}
                      {' · '}
                      {r.document_date}
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
        <IssueCreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            invalidate();
          }}
        />
      )}

      {detail && (
        <IssueDetailModal
          detail={detail}
          postingId={postingId}
          statusLabel={statusLabel(detail.status)}
          onClose={() => setDetail(null)}
          onPost={() => handlePost(detail.id)}
        />
      )}
    </div>
  );
}

function IssueDetailModal({
  detail,
  postingId,
  statusLabel,
  onClose,
  onPost,
}: {
  detail: WarehouseIssue;
  postingId: string | null;
  statusLabel: string;
  onClose: () => void;
  onPost: () => void;
}) {
  const total = useMemo(
    () =>
      (detail.lines ?? []).reduce((sum, line) => {
        const rowTotal = lineTotal(line);
        return sum + (rowTotal ?? 0);
      }, 0),
    [detail.lines]
  );
  const hasTotals = (detail.lines ?? []).some((l) => l.unit_price != null);

  return (
    <Modal
      open
      title="Izrakstīšanas pavadzīme"
      onClose={onClose}
      footer={
        detail.status === 'draft' ? (
          <button
            type="button"
            className="btn-primary"
            disabled={postingId === detail.id}
            onClick={onPost}
          >
            {postingId === detail.id ? 'Grāmato...' : 'Grāmatot'}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-3 space-y-1">
          <p className="font-semibold text-gray-900">Izsniedzējs: TRIO IT</p>
          <p>
            <span className="text-gray-500">Mūsu dok. nr.:</span> {detail.document_number}
          </p>
          <p>
            <span className="text-gray-500">Izrakstīšanas datums:</span> {detail.document_date}
          </p>
          <p>
            <span className="text-gray-500">Statuss:</span> {statusLabel}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 px-3 py-3 space-y-1">
          <p className="font-medium text-gray-800">Saņēmējs (pircējs)</p>
          <p>{detail.buyer_name}</p>
          {detail.buyer_registration_number && (
            <p className="text-gray-600">Reģ. nr.: {detail.buyer_registration_number}</p>
          )}
          {detail.buyer_vat_number && (
            <p className="text-gray-600">PVN nr.: {detail.buyer_vat_number}</p>
          )}
          {detail.buyer_address && (
            <p className="text-gray-600">Juridiskā adrese: {detail.buyer_address}</p>
          )}
          {detail.buyer_document_number && (
            <p className="text-gray-600">Pircēja dok. nr.: {detail.buyer_document_number}</p>
          )}
        </div>

        {detail.delivery_address && (
          <p>
            <span className="text-gray-500">Preču izsniegšanas / saņemšanas vieta:</span>{' '}
            {detail.delivery_address}
          </p>
        )}
        {detail.operation_description && (
          <p>
            <span className="text-gray-500">Darījuma apraksts:</span> {detail.operation_description}
          </p>
        )}
        {detail.notes && (
          <p>
            <span className="text-gray-500">Piezīmes:</span> {detail.notes}
          </p>
        )}

        {detail.lines && detail.lines.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-gray-600">Prece</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Mērv.</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-right">Daudz.</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-right">Cena</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-right">Summa</th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.map((l) => (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{l.product_name}</td>
                    <td className="px-3 py-2 text-gray-600">{l.product_unit ?? 'gab.'}</td>
                    <td className="px-3 py-2 text-right">{l.quantity}</td>
                    <td className="px-3 py-2 text-right">
                      {l.unit_price != null ? formatMoney(Number(l.unit_price)) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {lineTotal(l) != null ? formatMoney(lineTotal(l)!) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {hasTotals && (
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={4} className="px-3 py-2 text-right font-medium">
                      Kopā:
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{formatMoney(total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

function IssueCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [buyerId, setBuyerId] = useState('');
  const [buyerDocumentNumber, setBuyerDocumentNumber] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [operationDescription, setOperationDescription] = useState('Preču izsniegšana no noliktavas');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: clientsData } = useQuery({
    queryKey: ['warehouse-buyers'],
    queryFn: () => clientsApi.list({ warehouse: '1', limit: '500' }),
  });
  const { data: productsData } = useQuery({
    queryKey: ['warehouse-products-all'],
    queryFn: () => warehouseCommercialApi.listProducts(),
  });

  const buyers = (clientsData?.data ?? []).filter((c) => flag(c.is_buyer));
  const products = productsData?.data ?? [];
  const selectedBuyer = buyers.find((b) => b.id === buyerId);

  useEffect(() => {
    if (!selectedBuyer) return;
    const addr = [selectedBuyer.address, selectedBuyer.city].filter(Boolean).join(', ');
    setDeliveryAddress(addr);
  }, [selectedBuyer?.id]);

  const updateLine = (idx: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const handleSave = async () => {
    if (!buyerId) {
      setError('Izvēlieties pircēju');
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

    for (const line of validLines) {
      const product = products.find((p) => p.id === line.product_id);
      if (
        product &&
        !isProductService(product) &&
        Number(line.quantity) > Number(product.quantity_on_hand)
      ) {
        setError(
          `Nepietiekams atlikums: ${product.name} (pieejams ${product.quantity_on_hand} ${product.unit})`
        );
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      await warehouseCommercialApi.createIssue({
        buyer_id: buyerId,
        buyer_document_number: buyerDocumentNumber.trim() || undefined,
        document_date: documentDate,
        operation_description: operationDescription.trim() || undefined,
        delivery_address: deliveryAddress.trim() || undefined,
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
      title="Jauna izrakstīšanas pavadzīme"
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
      <div className="space-y-4">
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-600">
          Mūsu iekšējais dokuments tiks piešķirts automātiski pēc saglabāšanas (WH-OUT-…).
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Pircējs (preču saņēmējs) *</label>
            <select
              className="input-field"
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
            >
              <option value="">Izvēlieties pircēju</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {selectedBuyer && (
            <div className="text-xs text-gray-500 space-y-0.5 px-1">
              {selectedBuyer.registration_number && (
                <p>Reģ. nr.: {selectedBuyer.registration_number}</p>
              )}
              {selectedBuyer.vat_number && <p>PVN nr.: {selectedBuyer.vat_number}</p>}
              {selectedBuyer.address && <p>Adrese: {selectedBuyer.address}</p>}
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Pircēja pasūtījuma / rēķina nr.
            </label>
            <input
              className="input-field"
              placeholder="Piem., PO-2026/88"
              value={buyerDocumentNumber}
              onChange={(e) => setBuyerDocumentNumber(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Izrakstīšanas datums *</label>
            <input
              className="input-field"
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Preču izsniegšanas / saņemšanas vieta
            </label>
            <input
              className="input-field"
              placeholder="Adrese, kur tiek nodotas preces"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Darījuma apraksts</label>
            <input
              className="input-field"
              placeholder="Piem., Preču izsniegšana no noliktavas"
              value={operationDescription}
              onChange={(e) => setOperationDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Piezīmes</label>
            <textarea
              className="input-field min-h-[60px]"
              placeholder="Papildu informācija"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Preces</p>
          {lines.map((line, idx) => {
            const product = products.find((p) => p.id === line.product_id);
            const qty = Number(line.quantity) || 0;
            const price = line.unit_price ? Number(line.unit_price) : null;
            const sum = price != null ? qty * price : null;
            const overStock =
              product &&
              !isProductService(product) &&
              qty > 0 &&
              qty > Number(product.quantity_on_hand);
            return (
              <div key={idx} className="space-y-1">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <select
                    className="input-field col-span-12 sm:col-span-5"
                    value={line.product_id}
                    onChange={(e) => updateLine(idx, { product_id: e.target.value })}
                  >
                    <option value="">Prece</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {isProductService(p)
                          ? ' (pakalpojums)'
                          : ` (atlikums: ${p.quantity_on_hand} ${p.unit})`}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input-field col-span-4 sm:col-span-2"
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="Daudz."
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                  />
                  <input
                    className="input-field col-span-4 sm:col-span-2"
                    type="number"
                    step="0.01"
                    placeholder="Cena"
                    value={line.unit_price}
                    onChange={(e) => updateLine(idx, { unit_price: e.target.value })}
                  />
                  <div className="col-span-4 sm:col-span-3 text-right text-sm text-gray-600 pr-1">
                    {sum != null ? `${formatMoney(sum)} ${product?.unit ?? ''}` : '—'}
                  </div>
                </div>
                {overStock && (
                  <p className="text-xs text-amber-700 px-1">
                    Pārsniedz atlikumu ({product!.quantity_on_hand} {product!.unit})
                  </p>
                )}
              </div>
            );
          })}
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
