import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../../api/client';

import {

  isProductService,

  warehouseCommercialApi,

  type WarehouseProduct,

  type WarehouseProductGroup,

} from '../../api/warehouseCommercial';

import { Modal } from '../../components/ui/Modal';



function mainGroups(groups: WarehouseProductGroup[]) {

  return groups.filter((g) => !g.parent_id);

}



function subgroupsFor(groups: WarehouseProductGroup[], parentId: string) {

  return groups.filter((g) => g.parent_id === parentId);

}



export function WarehouseProductsPage() {

  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');

  const [groupFilter, setGroupFilter] = useState('');

  const [productModal, setProductModal] = useState<{ open: boolean; initial?: WarehouseProduct | null }>({

    open: false,

  });

  const [mainGroupName, setMainGroupName] = useState('');

  const [subgroupDraft, setSubgroupDraft] = useState<{ parentId: string; name: string } | null>(null);

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

  const mains = mainGroups(groups);



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



  return (

    <div className="space-y-6">

      <section className="card space-y-3">

        <h3 className="font-medium text-gray-800">Preču grupas</h3>

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

              const totalProducts =

                (g.product_count ?? 0) + subs.reduce((sum, s) => sum + (s.product_count ?? 0), 0);

              return (

                <li key={g.id} className="rounded-xl border border-gray-100 p-3 space-y-2">

                  <div className="flex flex-wrap items-center justify-between gap-2">

                    <div>

                      <p className="font-medium text-gray-900">{g.name}</p>

                      <p className="text-xs text-gray-500">{totalProducts} preces</p>

                    </div>

                    <button

                      type="button"

                      className="text-sm text-primary-600 font-medium"

                      onClick={() => setSubgroupDraft({ parentId: g.id, name: '' })}

                    >

                      + Apakšgrupa

                    </button>

                  </div>

                  {subs.length > 0 && (

                    <div className="flex flex-wrap gap-2 pl-2 border-l-2 border-gray-100">

                      {subs.map((s) => (

                        <span

                          key={s.id}

                          className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full"

                        >

                          {s.name} ({s.product_count ?? 0})

                        </span>

                      ))}

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

            {mains.map((g) => (

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

                    {isProductService(p)
                      ? ''
                      : ` · Atlikums: ${p.quantity_on_hand} ${p.unit}`}

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



function ProductModal({

  groups,

  initial,

  onClose,

  onSaved,

}: {

  groups: WarehouseProductGroup[];

  initial?: WarehouseProduct | null;

  onClose: () => void;

  onSaved: () => void;

}) {

  const initialSelection = resolveGroupSelection(groups, initial?.group_id);

  const [name, setName] = useState(initial?.name ?? '');

  const [sku, setSku] = useState(initial?.sku ?? '');

  const [mainGroupId, setMainGroupId] = useState(initialSelection.mainGroupId);

  const [subgroupId, setSubgroupId] = useState(initialSelection.subgroupId);

  const [unit, setUnit] = useState(initial?.unit ?? 'gab');

  const [purchasePrice, setPurchasePrice] = useState(

    initial?.purchase_price != null ? String(initial.purchase_price) : ''

  );

  const [salePrice, setSalePrice] = useState(

    initial?.sale_price != null ? String(initial.sale_price) : ''

  );

  const [isService, setIsService] = useState(isProductService(initial));

  const [error, setError] = useState('');

  const [saving, setSaving] = useState(false);



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

        sku: sku.trim() || undefined,

        group_id: subgroupId || mainGroupId || null,

        unit: unit.trim() || 'gab',

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

      {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl mb-3">{error}</div>}

      <div className="space-y-3">

        <input className="input-field" placeholder="Nosaukums *" value={name} onChange={(e) => setName(e.target.value)} />

        <input className="input-field" placeholder="Artikuls / SKU" value={sku} onChange={(e) => setSku(e.target.value)} />

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

        <input className="input-field" placeholder="Mērvienība" value={unit} onChange={(e) => setUnit(e.target.value)} />

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            checked={isService}
            onChange={(e) => setIsService(e.target.checked)}
          />
          Pakalpojums (bez atlikuma uzskaites)
        </label>

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


