import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { clientsApi } from '../../api/clients';
import {
  warehouseCommercialApi,
  type ReceiptLine,
  type WarehouseProduct,
  type WarehouseReceipt,
} from '../../api/warehouseCommercial';
import { Modal } from '../../components/ui/Modal';
import {
  calcMarkupPercent,
  calcReceiptTotals,
  calcSaleFromMarkup,
  paymentStatusLabel,
  roundMoney,
} from '../../utils/warehousePricing';

function flag(v: unknown) {
  return v === true || v === 1 || v === '1';
}

function formatMoney(value: number) {
  return value.toLocaleString('lv-LV', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type LineDraft = {
  product_id: string;
  quantity: string;
  purchase_price: string;
  markup_percent: string;
  sale_price: string;
  vat_rate: number;
};

const emptyLine = (): LineDraft => ({
  product_id: '',
  quantity: '1',
  purchase_price: '',
  markup_percent: '',
  sale_price: '',
  vat_rate: 21,
});

function lineDraftFromReceipt(line: ReceiptLine): LineDraft {
  return {
    product_id: line.product_id,
    quantity: String(line.quantity),
    purchase_price: line.unit_price != null ? String(line.unit_price) : '',
    markup_percent: line.markup_percent != null ? String(line.markup_percent) : '',
    sale_price: line.sale_price != null ? String(line.sale_price) : '',
    vat_rate: Number(line.product_vat_rate ?? 21),
  };
}

function receiptStatusLabel(s: WarehouseReceipt['status']) {
  if (s === 'posted') return 'Grāmatots';
  if (s === 'cancelled') return 'Atcelts';
  return 'Melnraksts';
}

export function WarehouseReceiptsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editorReceipt, setEditorReceipt] = useState<WarehouseReceipt | null>(null);
  const [viewReceipt, setViewReceipt] = useState<WarehouseReceipt | null>(null);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'supplier'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: clientsData } = useQuery({
    queryKey: ['warehouse-suppliers'],
    queryFn: () => clientsApi.list({ warehouse: '1', limit: '500' }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['warehouse-receipts', supplierFilter, unpaidOnly, sortBy, sortDir],
    queryFn: () =>
      warehouseCommercialApi.listReceipts({
        supplier_id: supplierFilter || undefined,
        unpaid_only: unpaidOnly,
        sort_by: sortBy,
        sort_dir: sortDir,
      }),
  });

  const suppliers = (clientsData?.data ?? []).filter((c) => flag(c.is_supplier));
  const receipts = data?.data ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['warehouse-receipts'] });
    queryClient.invalidateQueries({ queryKey: ['warehouse-products'] });
    queryClient.invalidateQueries({ queryKey: ['warehouse-journal-movements'] });
    queryClient.invalidateQueries({ queryKey: ['warehouse-products-journal'] });
  };

  const openReceipt = async (r: WarehouseReceipt) => {
    try {
      const res = await warehouseCommercialApi.getReceipt(r.id);
      if (res.data.status === 'draft') setEditorReceipt(res.data);
      else setViewReceipt(res.data);
    } catch {
      if (r.status === 'draft') setEditorReceipt(r);
      else setViewReceipt(r);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Saņemšana — vispirms izveidojiet pavadzīmes galvu, pēc tam pievienojiet preces ar iepirkuma
        un pārdošanas cenām.
      </p>

      <div className="flex flex-col lg:flex-row gap-2 lg:items-end lg:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <select
            className="input-field sm:w-48"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          >
            <option value="">Visi piegādātāji</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="input-field sm:w-40"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'supplier')}
          >
            <option value="date">Kārtot pēc datuma</option>
            <option value="supplier">Kārtot pēc piegādātāja</option>
          </select>
          <select
            className="input-field sm:w-32"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
          >
            <option value="desc">Dilstoši</option>
            <option value="asc">Augoši</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700 px-1">
            <input
              type="checkbox"
              checked={unpaidOnly}
              onChange={(e) => setUnpaidOnly(e.target.checked)}
            />
            Tikai neapmaksātās
          </label>
        </div>
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
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-3 py-2 font-medium">Datums</th>
                <th className="px-3 py-2 font-medium">Piegādātājs</th>
                <th className="px-3 py-2 font-medium">Pavadzīmes nr.</th>
                <th className="px-3 py-2 font-medium text-right">Iepirkums bez PVN</th>
                <th className="px-3 py-2 font-medium text-right">PVN summa</th>
                <th className="px-3 py-2 font-medium text-right">Summa ar PVN</th>
                <th className="px-3 py-2 font-medium text-right">Pārdošana ar PVN</th>
                <th className="px-3 py-2 font-medium">Apmaksa</th>
                <th className="px-3 py-2 font-medium">Statuss</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openReceipt(r)}
                >
                  <td className="px-3 py-2 whitespace-nowrap">{r.document_date}</td>
                  <td className="px-3 py-2">{r.supplier_name}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{r.document_number}</td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(Number(r.total_purchase_ex_vat ?? 0))}
                  </td>
                  <td className="px-3 py-2 text-right">{formatMoney(Number(r.total_vat ?? 0))}</td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(Number(r.total_purchase_inc_vat ?? 0))}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(Number(r.total_sale_inc_vat ?? 0))}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        r.payment_status === 'paid'
                          ? 'bg-green-50 text-green-800'
                          : r.payment_status === 'partial'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {paymentStatusLabel(r.payment_status ?? 'unpaid')}
                    </span>
                    {r.payment_status === 'partial' && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Atlikums: {formatMoney(Number(r.amount_remaining ?? 0))}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-gray-600">{receiptStatusLabel(r.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <ReceiptHeaderModal
          suppliers={suppliers}
          onClose={() => setCreateOpen(false)}
          onCreated={(receipt) => {
            setCreateOpen(false);
            invalidate();
            setEditorReceipt(receipt);
          }}
        />
      )}

      {editorReceipt && (
        <ReceiptEditorModal
          receipt={editorReceipt}
          onClose={() => setEditorReceipt(null)}
          onUpdated={(r) => {
            setEditorReceipt(r);
            invalidate();
          }}
          onPosted={(r) => {
            setEditorReceipt(null);
            setViewReceipt(r);
            invalidate();
          }}
        />
      )}

      {viewReceipt && (
        <ReceiptViewModal
          receipt={viewReceipt}
          onClose={() => setViewReceipt(null)}
          onUpdated={(r) => {
            setViewReceipt(r);
            invalidate();
          }}
          onUnposted={(r) => {
            setViewReceipt(null);
            setEditorReceipt(r);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function ReceiptHeaderModal({
  suppliers,
  onClose,
  onCreated,
}: {
  suppliers: { id: string; name: string; registration_number?: string | null; vat_number?: string | null; address?: string | null }[];
  onClose: () => void;
  onCreated: (receipt: WarehouseReceipt) => void;
}) {
  const [supplierId, setSupplierId] = useState('');
  const [supplierDocumentNumber, setSupplierDocumentNumber] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [operationDescription, setOperationDescription] = useState('Preču piegāde noliktavā');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const handleSave = async () => {
    if (!supplierId) {
      setError('Izvēlieties piegādātāju');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await warehouseCommercialApi.createReceipt({
        supplier_id: supplierId,
        supplier_document_number: supplierDocumentNumber.trim() || undefined,
        document_date: documentDate,
        operation_description: operationDescription.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.displayMessage : 'Neizdevās izveidot');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title="Jauna saņemšanas pavadzīme — galva"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Atcelt
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saglabā...' : 'Saglabāt un turpināt'}
          </button>
        </>
      }
    >
      {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl mb-3">{error}</div>}
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          Vispirms saglabājiet pavadzīmes galvu. Pēc tam varēsiet pievienot preces.
        </p>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Piegādātājs *</label>
          <select className="input-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Izvēlieties piegādātāju</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {selectedSupplier && (
          <div className="text-xs text-gray-500 space-y-0.5 px-1">
            {selectedSupplier.registration_number && <p>Reģ. nr.: {selectedSupplier.registration_number}</p>}
            {selectedSupplier.vat_number && <p>PVN nr.: {selectedSupplier.vat_number}</p>}
            {selectedSupplier.address && <p>Adrese: {selectedSupplier.address}</p>}
          </div>
        )}
        <input
          className="input-field"
          placeholder="Piegādātāja rēķina / pavadzīmes nr."
          value={supplierDocumentNumber}
          onChange={(e) => setSupplierDocumentNumber(e.target.value)}
        />
        <input
          className="input-field"
          type="date"
          value={documentDate}
          onChange={(e) => setDocumentDate(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Darījuma apraksts"
          value={operationDescription}
          onChange={(e) => setOperationDescription(e.target.value)}
        />
        <textarea
          className="input-field min-h-[60px]"
          placeholder="Piezīmes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}

function ProductPickerModal({
  products,
  onSelect,
  onClose,
}: {
  products: WarehouseProduct[];
  onSelect: (product: WarehouseProduct) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'name' | 'sku'>('name');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products.slice(0, 50);
    return products.filter((p) => {
      if (mode === 'sku') return (p.sku ?? '').toLowerCase().includes(term);
      return (
        p.name.toLowerCase().includes(term) ||
        (p.secondary_name ?? '').toLowerCase().includes(term) ||
        (p.sku ?? '').toLowerCase().includes(term)
      );
    });
  }, [products, search, mode]);

  return (
    <Modal open title="Izvēlēties preci" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            className={`text-sm px-3 py-1 rounded-lg ${mode === 'name' ? 'bg-primary-100 text-primary-800' : 'bg-gray-100'}`}
            onClick={() => setMode('name')}
          >
            Pēc nosaukuma
          </button>
          <button
            type="button"
            className={`text-sm px-3 py-1 rounded-lg ${mode === 'sku' ? 'bg-primary-100 text-primary-800' : 'bg-gray-100'}`}
            onClick={() => setMode('sku')}
          >
            Pēc artikula
          </button>
          <Link
            to="/warehouse/products"
            target="_blank"
            className="text-sm text-primary-600 font-medium px-2 py-1"
          >
            Atvērt preces un grupas ↗
          </Link>
        </div>
        <input
          className="input-field"
          placeholder={mode === 'sku' ? 'Meklēt artikulu...' : 'Meklēt nosaukumu...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ul className="max-h-64 overflow-y-auto space-y-1">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100"
                onClick={() => onSelect(p)}
              >
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {[p.sku, p.secondary_name, p.unit].filter(Boolean).join(' · ')}
                </p>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <p className="text-sm text-gray-500 py-4 text-center">Nav preču</p>}
        </ul>
      </div>
    </Modal>
  );
}

function ReceiptLinesEditor({
  lines,
  products,
  onChange,
}: {
  lines: LineDraft[];
  products: WarehouseProduct[];
  onChange: (lines: LineDraft[]) => void;
}) {
  const [pickerForIdx, setPickerForIdx] = useState<number | null>(null);

  const updateLine = (idx: number, patch: Partial<LineDraft>) => {
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const applyProduct = (idx: number, product: WarehouseProduct) => {
    const purchase = product.purchase_price != null ? String(product.purchase_price) : '';
    const sale = product.sale_price != null ? String(product.sale_price) : '';
    const markup =
      product.purchase_price != null && product.sale_price != null
        ? String(calcMarkupPercent(Number(product.purchase_price), Number(product.sale_price)) ?? '')
        : '';
    updateLine(idx, {
      product_id: product.id,
      vat_rate: Number(product.vat_rate ?? 21),
      purchase_price: purchase,
      sale_price: sale,
      markup_percent: markup,
    });
    setPickerForIdx(null);
  };

  const onMarkupChange = (idx: number, markup: string) => {
    const line = lines[idx];
    const purchase = Number(line.purchase_price);
    const next: Partial<LineDraft> = { markup_percent: markup };
    if (markup && Number.isFinite(purchase) && purchase > 0) {
      next.sale_price = String(calcSaleFromMarkup(purchase, Number(markup)));
    }
    updateLine(idx, next);
  };

  const onSaleChange = (idx: number, sale: string) => {
    const line = lines[idx];
    const purchase = Number(line.purchase_price);
    const saleNum = Number(sale);
    const next: Partial<LineDraft> = { sale_price: sale };
    if (Number.isFinite(purchase) && purchase > 0 && Number.isFinite(saleNum)) {
      const markup = calcMarkupPercent(purchase, saleNum);
      next.markup_percent = markup != null ? String(markup) : '';
    }
    updateLine(idx, next);
  };

  const pricingLines = lines
    .filter((l) => l.product_id && Number(l.quantity) > 0)
    .map((l) => ({
      quantity: Number(l.quantity),
      purchase_price_ex_vat: Number(l.purchase_price) || 0,
      sale_price_ex_vat: Number(l.sale_price) || 0,
      vat_rate: l.vat_rate,
    }));
  const totals = calcReceiptTotals(pricingLines);

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        const product = products.find((p) => p.id === line.product_id);
        return (
          <div key={idx} className="rounded-xl border border-gray-100 p-3 space-y-2">
            <div className="flex gap-2 flex-wrap items-center">
              <button
                type="button"
                className="btn-secondary !py-1.5 !px-3 !min-h-0 text-sm flex-1 text-left"
                onClick={() => setPickerForIdx(idx)}
              >
                {product ? `${product.name}${product.sku ? ` (${product.sku})` : ''}` : 'Izvēlēties preci'}
              </button>
              <button
                type="button"
                className="text-sm text-primary-600 font-medium"
                onClick={() => onChange(lines.filter((_, i) => i !== idx))}
              >
                Noņemt
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.001"
                placeholder="Daudzums"
                value={line.quantity}
                onChange={(e) => updateLine(idx, { quantity: e.target.value })}
              />
              <input
                className="input-field"
                type="number"
                step="0.01"
                placeholder="Iepirkums bez PVN"
                value={line.purchase_price}
                onChange={(e) => updateLine(idx, { purchase_price: e.target.value })}
              />
              <input
                className="input-field"
                type="number"
                step="0.01"
                placeholder="Piecenojums %"
                value={line.markup_percent}
                onChange={(e) => onMarkupChange(idx, e.target.value)}
              />
              <input
                className="input-field"
                type="number"
                step="0.01"
                placeholder="Pārdošana bez PVN"
                value={line.sale_price}
                onChange={(e) => onSaleChange(idx, e.target.value)}
              />
              <div className="input-field bg-gray-50 text-gray-600 flex items-center text-sm">
                PVN {line.vat_rate}%
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        className="text-sm text-primary-600 font-medium"
        onClick={() => onChange([...lines, emptyLine()])}
      >
        + Pievienot preci
      </button>

      {pricingLines.length > 0 && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Kopā iepirkums bez PVN</span>
            <span className="font-medium">{formatMoney(totals.purchase_ex_vat)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">PVN summa</span>
            <span className="font-medium">{formatMoney(totals.vat_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Summa ar PVN</span>
            <span className="font-medium">{formatMoney(totals.purchase_inc_vat)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
            <span className="text-gray-800 font-medium">Kopā pārdošana ar PVN</span>
            <span className="font-semibold text-gray-900">{formatMoney(totals.sale_inc_vat)}</span>
          </div>
        </div>
      )}

      {pickerForIdx != null && (
        <ProductPickerModal
          products={products}
          onClose={() => setPickerForIdx(null)}
          onSelect={(p) => applyProduct(pickerForIdx, p)}
        />
      )}
    </div>
  );
}

function ReceiptEditorModal({
  receipt,
  onClose,
  onUpdated,
  onPosted,
}: {
  receipt: WarehouseReceipt;
  onClose: () => void;
  onUpdated: (r: WarehouseReceipt) => void;
  onPosted: (r: WarehouseReceipt) => void;
}) {
  const [header, setHeader] = useState({
    supplier_document_number: receipt.supplier_document_number ?? '',
    document_date: receipt.document_date,
    operation_description: receipt.operation_description ?? '',
    notes: receipt.notes ?? '',
  });
  const [lines, setLines] = useState<LineDraft[]>(
    receipt.lines?.length ? receipt.lines.map(lineDraftFromReceipt) : [emptyLine()]
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  const { data: productsData } = useQuery({
    queryKey: ['warehouse-products-all'],
    queryFn: () => warehouseCommercialApi.listProducts(),
  });
  const products = productsData?.data ?? [];

  const buildValidLines = () =>
    lines
      .filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({
        product_id: l.product_id,
        quantity: Number(l.quantity),
        purchase_price: l.purchase_price ? Number(l.purchase_price) : null,
        markup_percent: l.markup_percent ? Number(l.markup_percent) : null,
        sale_price: l.sale_price ? roundMoney(Number(l.sale_price)) : null,
      }));

  const handleSave = async () => {
    const validLines = buildValidLines();
    if (validLines.length === 0) {
      setError('Pievienojiet vismaz vienu preci');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await warehouseCommercialApi.updateReceipt(receipt.id, {
        supplier_document_number: header.supplier_document_number.trim() || undefined,
        document_date: header.document_date,
        operation_description: header.operation_description.trim() || undefined,
        notes: header.notes.trim() || undefined,
      });
      const res = await warehouseCommercialApi.updateReceiptLines(receipt.id, validLines);
      onUpdated(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.displayMessage : 'Saglabāšana neizdevās');
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async () => {
    setPosting(true);
    setError('');
    try {
      const validLines = buildValidLines();
      if (validLines.length === 0) {
        setError('Pievienojiet vismaz vienu preci');
        return;
      }
      await warehouseCommercialApi.updateReceipt(receipt.id, {
        supplier_document_number: header.supplier_document_number.trim() || undefined,
        document_date: header.document_date,
        operation_description: header.operation_description.trim() || undefined,
        notes: header.notes.trim() || undefined,
      });
      await warehouseCommercialApi.updateReceiptLines(receipt.id, validLines);
      const res = await warehouseCommercialApi.postReceipt(receipt.id);
      onPosted(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.displayMessage : 'Grāmatošana neizdevās');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal
      open
      title={`Pavadzīme ${receipt.document_number}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Aizvērt
          </button>
          <button type="button" className="btn-secondary" onClick={handleSave} disabled={saving || posting}>
            {saving ? 'Saglabā...' : 'Saglabāt'}
          </button>
          <button type="button" className="btn-primary" onClick={handlePost} disabled={saving || posting}>
            {posting ? 'Grāmato...' : 'Grāmatot'}
          </button>
        </>
      }
    >
      {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl mb-3">{error}</div>}
      <div className="space-y-4 text-sm">
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-3 space-y-2">
          <p>
            <span className="text-gray-500">Piegādātājs:</span> {receipt.supplier_name}
          </p>
          <input
            className="input-field"
            placeholder="Piegādātāja rēķina / pavadzīmes nr."
            value={header.supplier_document_number}
            onChange={(e) => setHeader((h) => ({ ...h, supplier_document_number: e.target.value }))}
          />
          <input
            className="input-field"
            type="date"
            value={header.document_date}
            onChange={(e) => setHeader((h) => ({ ...h, document_date: e.target.value }))}
          />
          <input
            className="input-field"
            placeholder="Darījuma apraksts"
            value={header.operation_description}
            onChange={(e) => setHeader((h) => ({ ...h, operation_description: e.target.value }))}
          />
          <textarea
            className="input-field min-h-[50px]"
            placeholder="Piezīmes"
            value={header.notes}
            onChange={(e) => setHeader((h) => ({ ...h, notes: e.target.value }))}
          />
        </div>
        <ReceiptLinesEditor lines={lines} products={products} onChange={setLines} />
      </div>
    </Modal>
  );
}

function ReceiptViewModal({
  receipt,
  onClose,
  onUpdated,
  onUnposted,
}: {
  receipt: WarehouseReceipt;
  onClose: () => void;
  onUpdated: (r: WarehouseReceipt) => void;
  onUnposted: (r: WarehouseReceipt) => void;
}) {
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handlePay = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      setError('Ievadiet apmaksas summu');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await warehouseCommercialApi.payReceipt(receipt.id, amount);
      onUpdated(res.data);
      setPayOpen(false);
      setPayAmount('');
    } catch (e) {
      setError(e instanceof ApiError ? e.displayMessage : 'Apmaksa neizdevās');
    } finally {
      setBusy(false);
    }
  };

  const handleUnpost = async () => {
    if (!confirm('Atcelt grāmatošanu un atgriezt pavadzīmi labošanai?')) return;
    setBusy(true);
    try {
      const res = await warehouseCommercialApi.unpostReceipt(receipt.id);
      onUnposted(res.data);
    } catch (e) {
      alert(e instanceof ApiError ? e.displayMessage : 'Neizdevās atcelt grāmatošanu');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={`Pavadzīme ${receipt.document_number}`}
      onClose={onClose}
      footer={
        <>
          {receipt.status === 'posted' && (
            <>
              <button type="button" className="btn-secondary" onClick={handleUnpost} disabled={busy}>
                Atcelt grāmatošanu
              </button>
              {receipt.payment_status !== 'paid' && (
                <button type="button" className="btn-primary" onClick={() => setPayOpen(true)}>
                  Apmaksāt
                </button>
              )}
            </>
          )}
        </>
      }
    >
      {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl mb-3">{error}</div>}
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p>
            <span className="text-gray-500">Datums:</span> {receipt.document_date}
          </p>
          <p>
            <span className="text-gray-500">Statuss:</span> {receiptStatusLabel(receipt.status)}
          </p>
          <p className="col-span-2">
            <span className="text-gray-500">Piegādātājs:</span> {receipt.supplier_name}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Prece</th>
                <th className="px-3 py-2 text-right">Daudz.</th>
                <th className="px-3 py-2 text-right">Iepirkums</th>
                <th className="px-3 py-2 text-right">Pārdošana</th>
              </tr>
            </thead>
            <tbody>
              {(receipt.lines ?? []).map((l) => (
                <tr key={l.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{l.product_name}</td>
                  <td className="px-3 py-2 text-right">
                    {l.quantity} {l.product_unit}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {l.unit_price != null ? formatMoney(Number(l.unit_price)) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {l.sale_price != null ? formatMoney(Number(l.sale_price)) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-3 space-y-1">
          <div className="flex justify-between">
            <span>Iepirkums bez PVN</span>
            <span>{formatMoney(Number(receipt.total_purchase_ex_vat ?? 0))}</span>
          </div>
          <div className="flex justify-between">
            <span>PVN summa</span>
            <span>{formatMoney(Number(receipt.total_vat ?? 0))}</span>
          </div>
          <div className="flex justify-between">
            <span>Summa ar PVN</span>
            <span>{formatMoney(Number(receipt.total_purchase_inc_vat ?? 0))}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Pārdošana ar PVN</span>
            <span>{formatMoney(Number(receipt.total_sale_inc_vat ?? 0))}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
            <span>Apmaksa</span>
            <span>
              {paymentStatusLabel(receipt.payment_status ?? 'unpaid')}
              {Number(receipt.amount_paid ?? 0) > 0 && ` (${formatMoney(Number(receipt.amount_paid))})`}
            </span>
          </div>
          {receipt.payment_status === 'partial' && (
            <div className="flex justify-between text-amber-800">
              <span>Atlikums apmaksai</span>
              <span>{formatMoney(Number(receipt.amount_remaining ?? 0))}</span>
            </div>
          )}
        </div>

        {payOpen && (
          <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-3 space-y-2">
            <p className="font-medium text-gray-800">Apmaksāt pavadzīmi</p>
            <p className="text-xs text-gray-600">
              Kopā ar PVN: {formatMoney(Number(receipt.total_purchase_inc_vat ?? 0))}
              {receipt.payment_status === 'partial' &&
                ` · Atlikums: ${formatMoney(Number(receipt.amount_remaining ?? 0))}`}
            </p>
            <input
              className="input-field"
              type="number"
              step="0.01"
              min="0"
              placeholder="Apmaksas summa"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <div className="flex gap-2">
              <button type="button" className="btn-primary" onClick={handlePay} disabled={busy}>
                {busy ? 'Apmaksā...' : 'Apmaksāt'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setPayOpen(false)}>
                Atcelt
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
