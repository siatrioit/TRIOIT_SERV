import { useQuery } from '@tanstack/react-query';
import { assetTypesApi } from '../../api/assetTypes';
import type { Unit } from '../../api/units';

type AssetComponentPickerProps = {
  unit: Pick<Unit, 'asset_type_id'> | null | undefined;
  value: string;
  onChange: (componentId: string) => void;
  label?: string;
};

export function AssetComponentPicker({
  unit,
  value,
  onChange,
  label = 'Apakšsadaļa (neobligāti)',
}: AssetComponentPickerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['asset-types', 'components'],
    queryFn: () => assetTypesApi.list(true),
  });

  const assetTypeId = unit?.asset_type_id;
  const components =
    data?.data.find((t) => t.id === assetTypeId)?.components?.filter((c) => c.is_active) ?? [];

  if (!assetTypeId || components.length === 0) return null;

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {isLoading ? (
        <p className="text-sm text-gray-400">Ielādē...</p>
      ) : (
        <select
          className="input-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— Nav norādīta —</option>
          {components.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
