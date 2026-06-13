import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import {
  isProductService,
  warehouseCommercialApi,
  type WarehouseProduct,
  type WarehouseProductGroup,
} from '../../api/warehouseCommercial';
import { calcProductMarkup } from '../../utils/warehousePricing';
import { Modal } from '../../components/ui/Modal';
import { WarehouseProductJournalCollapsible } from '../../components/warehouse/WarehouseProductJournalPanel';

function mainGroups(groups: WarehouseProductGroup[]) {
  return groups.filter((g) => !g.parent_id);
}

function subgroupsFor(groups: WarehouseProductGroup[], parentId: string) {
  return groups.filter((g) => g.parent_id === parentId);
}

type GroupSelection =
  | { kind: 'all' }
  | { kind: 'main'; id: string; name: string }
  | { kind: 'sub'; id: string; parentId: string; name: string; parentName: string };

function resolveGroupSelection(
  groups: WarehouseProductGroup[],
  groupId?: string | null
): { mainGroupId: string; subgroupId: string } {
  if (!groupId) return { mainGroupId: '', subgroupId: '' };
  const group = groups.find((g) => g.id === groupId);
  if (!group) return { mainGroupId: '', subgroupId: '' };
  if (group.parent_id) return { mainGroupId: group.parent_id, subgroupId: group.id };
  return { mainGroupId: group.id, subgroupId: '' };
}

function selectionToDefaultGroup(
  selection: GroupSelection
): { mainGroupId: string; subgroupId: string } {
  if (selection.kind === 'main') return { mainGroupId: selection.id, subgroupId: '' };
  if (selection.kind === 'sub') {
    return { mainGroupId: selection.parentId, subgroupId: selection.id };
  }
  return { mainGroupId: '', subgroupId: '' };
}

export function WarehouseProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<GroupSelection>({ kind: 'all' });
  const [productModal, setProductModal] = useState<{
    open: boolean;
    initial?: WarehouseProduct | null;
    defaultGroup?: { mainGroupId: string; subgroupId: string };
  }>({ open: false });
  const [mainGroupName, setMainGroupName] = useState('');
  const [subgroupDraft, setSubgroupDraft] = useState<{ parentId: string; name: string } | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState('');

  const filterGroupId = selection.kind === 'all' ? undefined : selection.id;

  const { data: groupsData } = useQuery({
    queryKey: ['warehouse-groups'],
    queryFn: () => warehouseCommercialApi.listGroups(),
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['warehouse-products', search, filterGroupId, selection.kind],
    queryFn: () =>
      warehouseCommercialApi.listProducts({
        search: search || undefined,
        group_id: filterGroupId,
        exact: selection.kind !== 'all',
      }),
  });

  const groups = groupsData?.data ?? [];
  const products = productsData?.data ?? [];
  const mains = mainGroups(groups);

  const selectionLabel = useMemo(() => {
    if (selection.kind === 'all') return 'Visas preces';
    if (selection.kind === 'main') return `Grupa: ${selection.name}`;
    return `${selection.parentName} / ${selection.name}`;
  }, [selection]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['warehouse-groups'] });
    queryClient.invalidateQueries({ queryKey: ['warehouse-products'] });
  };

  const addMainGroup = useMutation({
    mutationFn: () => warehouseCommercialApi.createGroup({ name: mainGroupName.trim() }),
    onSuccess: () => {
      setMainGroupName('');
      invalidate();
    },
    onError: (e) => setError(e instanceof ApiError ? e.displayMessage : 'Kļūda'),
  });

  const addSubgroup = useMutation({
    mutationFn: ({ parentId, name }: { parentId: string; name: string }) =>
      warehouseCommercialApi.createGroup({ name: name.trim(), parent_id: parentId }),
    onSuccess: () => {
      setSubgroupDraft(null);
      invalidate();
    },
    onError: (e) => setError(e instanceof ApiError ? e.displayMessage : 'Kļūda'),
  });

  const renameGroup = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      warehouseCommercialApi.updateGroup(id, { name: name.trim() }),
    onSuccess: (_data, vars) => {
      setEditingGroup(null);
      setSelection((prev) => {
        if (prev.kind === 'main' && prev.id === vars.id) {
          return { ...prev, name: vars.name.trim() };
        }
        if (prev.kind === 'sub' && prev.id === vars.id) {
          return { ...prev, name: vars.name.trim() };
        }
        return prev;
      });
      invalidate();
    },
    onError: (e) => setError(e instanceof ApiError ? e.displayMessage : 'Kļūda'),
  });

  const openNewProduct = () => {
    setProductModal({
      open: true,
      initial: null,
      defaultGroup: selectionToDefaultGroup(selection),
    });
  };

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium text-gray-800">Preču grupas</h3>
          {selection.kind !== 'all' && (
            <button
              type="button"
              className="text-sm text-gray-600 hover:text-gray-900"
              onClick={() => setSelection({ kind: 'all' })}
            >
              Rādīt visas preces
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <input
            className="input-field flex-1 min-w-[200px]"
            placeholder="Jaunas galvenās grupas nosaukums"
            value={mainGroupName}
            onChange={(e) => setMainGroupName(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary !py-2 !px-4 !min-h-0"
            disabled={!mainGroupName.trim() || addMainGroup.isPending}
            onClick={() => addMainGroup.mutate()}
          >
            + Grupa
          </button>
        </div>

        {mains.length === 0 ? (
          <p className="text-sm text-gray-500">Nav grupu</p>
        ) : (
          <ul className="space-y-3">
            {mains.map((g) => {
              const subs = subgroupsFor(groups, g.id);
              const isMainSelected = selection.kind === 'main' && selection.id === g.id;
              const totalInTree =
                (g.product_count ?? 0) + subs.reduce((sum, s) => sum + (s.product_count ?? 0), 0);

              return (
                <li
                  key={g.id}
                  className={`rounded-xl border p-3 space-y-2 ${
                    isMainSelected ? 'border-primary-300 bg-primary-50/40' : 'border-gray-100'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {editingGroup?.id === g.id ? (
                      <div className="flex gap-2 flex-1 min-w-[200px]">
                        <input
                          className="input-field flex-1"
                          value={editingGroup.name}
                          onChange={(e) =>
                            setEditingGroup({ id: g.id, name: e.target.value })
                          }
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn-primary !py-2 !px-3 !min-h-0 text-sm"
                          disabled={!editingGroup.name.trim() || renameGroup.isPending}
                          onClick={() =>
                            renameGroup.mutate({ id: g.id, name: editingGroup.name })
                          }
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          className="btn-secondary !py-2 !px-3 !min-h-0 text-sm"
                          onClick={() => setEditingGroup(null)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text-left flex-1"
                        onClick={() =>
                          setSelection({ kind: 'main', id: g.id, name: g.name })
                        }
                      >
                        <p className="font-medium text-gray-900">{g.name}</p>
                        <p className="text-xs text-gray-500">
                          {g.product_count ?? 0} tieši grupā · {totalInTree} kopā ar apakšgrupām
                        </p>
                      </button>
                    )}
                    <div className="flex gap-2">
                      {editingGroup?.id !== g.id && (
                        <button
                          type="button"
                          className="text-sm text-gray-500 hover:text-gray-800"
                          onClick={() => setEditingGroup({ id: g.id, name: g.name })}
                          title="Labot nosaukumu"
                        >
                          Labot
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-sm text-primary-600 font-medium"
                        onClick={() => setSubgroupDraft({ parentId: g.id, name: '' })}
                      >
                        + Apakšgrupa
                      </button>
                    </div>
                  </div>

                  {subs.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-2 border-l-2 border-gray-100">
                      {subs.map((s) => {
                        const isSubSelected =
                          selection.kind === 'sub' && selection.id === s.id;
                        const isEditing = editingGroup?.id === s.id;
                        return (
                          <div key={s.id} className="flex items-center gap-1">
                            {isEditing ? (
                              <div className="flex gap-1 items-center">
                                <input
                                  className="input-field !py-1 !px-2 text-sm w-36"
                                  value={editingGroup.name}
                                  onChange={(e) =>
                                    setEditingGroup({ id: s.id, name: e.target.value })
                                  }
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  className="text-xs text-primary-600 font-medium px-1"
                                  disabled={!editingGroup.name.trim() || renameGroup.isPending}
                                  onClick={() =>
                                    renameGroup.mutate({ id: s.id, name: editingGroup.name })
                                  }
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  className="text-xs text-gray-500 px-1"
                                  onClick={() => setEditingGroup(null)}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className={`text-sm px-3 py-1 rounded-full ${
                                    isSubSelected
                                      ? 'bg-primary-100 text-primary-800 font-medium'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                  onClick={() =>
                                    setSelection({
                                      kind: 'sub',
                                      id: s.id,
                                      parentId: g.id,
                                      name: s.name,
                                      parentName: g.name,
                                    })
                                  }
                                >
                                  {s.name} ({s.product_count ?? 0})
                                </button>
                                <button
                                  type="button"
                                  className="text-xs text-gray-400 hover:text-gray-700 px-0.5"
                                  onClick={() => setEditingGroup({ id: s.id, name: s.name })}
                                  title="Labot nosaukumu"
                                >
                                  ✎
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {subgroupDraft?.parentId === g.id && (
                    <div className="flex gap-2 pt-1">
                      <input
                        className="input-field flex-1"
                        placeholder="Apakšgrupas nosaukums"
                        value={subgroupDraft.name}
                        onChange={(e) =>
                          setSubgroupDraft({ parentId: g.id, name: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        className="btn-primary !py-2 !px-3 !min-h-0 text-sm"
                        disabled={!subgroupDraft.name.trim() || addSubgroup.isPending}
                        onClick={() =>
                          addSubgroup.mutate({ parentId: g.id, name: subgroupDraft.name })
                        }
                      >
                        Saglabāt
                      </button>
                      <button
                        type="button"
                        className="btn-secondary !py-2 !px-3 !min-h-0 text-sm"
                        onClick={() => setSubgroupDraft(null)}
                      >
                        Atcelt
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div>
            <h3 className="font-medium text-gray-800">Preces</h3>
            <p className="text-xs text-gray-500 mt-0.5">{selectionLabel}</p>
          </div>
          <button
            type="button"
            className="btn-primary !py-2 !px-4 !min-h-0 text-sm"
            onClick={openNewProduct}
          >
            + Jauna prece
          </button>
        </div>

        <input
          className="input-field"
          placeholder="Meklēt preci..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

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
                  onClick={() =>
                    setProductModal({ open: true, initial: p, defaultGroup: undefined })
                  }
                >
                  <p className="font-medium text-gray-900 flex flex-wrap items-center gap-2">
                    {p.name}
                    {isProductService(p) && (
                      <span className="text-xs bg-violet-50 text-violet-800 px-2 py-0.5 rounded-full font-normal">
                        Pakalpojums
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.group_path || 'Bez grupas'}
                    {p.sku ? ` · ${p.sku}` : ''}
                    {isProductService(p) ? '' : ` · Atlikums: ${p.quantity_on_hand} ${p.unit}`}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WarehouseProductJournalCollapsible />

      {productModal.open && (
        <ProductModal
          groups={groups}
          initial={productModal.initial}
          defaultGroup={productModal.defaultGroup}
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
  defaultGroup,
  onClose,
  onSaved,
}: {
  groups: WarehouseProductGroup[];
  initial?: WarehouseProduct | null;
  defaultGroup?: { mainGroupId: string; subgroupId: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialSelection = initial
    ? resolveGroupSelection(groups, initial.group_id)
    : defaultGroup ?? { mainGroupId: '', subgroupId: '' };

  const [name, setName] = useState(initial?.name ?? '');
  const [secondaryName, setSecondaryName] = useState(initial?.secondary_name ?? '');
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [mainGroupId, setMainGroupId] = useState(initialSelection.mainGroupId);
  const [subgroupId, setSubgroupId] = useState(initialSelection.subgroupId);
  const [unit, setUnit] = useState(initial?.unit ?? 'gab');
  const [vatRate, setVatRate] = useState(
    initial?.vat_rate != null ? String(initial.vat_rate) : '21'
  );
  const [purchasePrice, setPurchasePrice] = useState(
    initial?.purchase_price != null ? String(initial.purchase_price) : ''
  );
  const [salePrice, setSalePrice] = useState(
    initial?.sale_price != null ? String(initial.sale_price) : ''
  );
  const [isService, setIsService] = useState(isProductService(initial));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const markupPercent = calcProductMarkup(
    purchasePrice ? Number(purchasePrice) : null,
    salePrice ? Number(salePrice) : null
  );

  const mains = mainGroups(groups);
  const subgroups = mainGroupId ? subgroupsFor(groups, mainGroupId) : [];

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
        secondary_name: secondaryName.trim() || undefined,
        sku: sku.trim() || undefined,
        group_id: subgroupId || mainGroupId || null,
        unit: unit.trim() || 'gab',
        vat_rate: vatRate ? Number(vatRate) : 21,
        purchase_price: purchasePrice ? Number(purchasePrice) : null,
        sale_price: salePrice ? Number(salePrice) : null,
        is_service: isService,
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
      {error && (
        <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl mb-3">{error}</div>
      )}
      <div className="space-y-3">
        <input
          className="input-field"
          placeholder="Nosaukums *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Otrais nosaukums"
          value={secondaryName}
          onChange={(e) => setSecondaryName(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Artikuls / SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />

        <select
          className="input-field"
          value={mainGroupId}
          onChange={(e) => {
            setMainGroupId(e.target.value);
            setSubgroupId('');
          }}
        >
          <option value="">Bez grupas</option>
          {mains.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        {mainGroupId && subgroups.length > 0 && (
          <select
            className="input-field"
            value={subgroupId}
            onChange={(e) => setSubgroupId(e.target.value)}
          >
            <option value="">Bez apakšgrupas (tikai galvenā grupa)</option>
            {subgroups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <input
          className="input-field"
          placeholder="Mērvienība"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
        <input
          className="input-field"
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="PVN likme (%)"
          value={vatRate}
          onChange={(e) => setVatRate(e.target.value)}
        />
        <input
          className="input-field bg-gray-50"
          placeholder="Iepirkuma cena (no pavadzīmes)"
          value={purchasePrice}
          readOnly
          title="Atjauninās, grāmatojot saņemšanas pavadzīmi"
        />
        <div className="input-field bg-gray-50 text-gray-600 flex items-center text-sm">
          Piecenojums: {markupPercent != null ? `${markupPercent}%` : '—'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="input-field"
            placeholder="Pārdošanas cena"
            type="number"
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
          />
          {!isService && initial && (
            <div className="input-field bg-gray-50 text-gray-600 flex items-center text-sm">
              Atlikums: {initial.quantity_on_hand} {initial.unit}
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            checked={isService}
            onChange={(e) => setIsService(e.target.checked)}
          />
          Pakalpojums (bez atlikuma uzskaites)
        </label>
      </div>
    </Modal>
  );
}
