import type { Unit } from '../api/units';

export type UnitTreeNode = {
  unit: Unit;
  children: Unit[];
};

export function groupUnitsIntoTree(units: Unit[]): UnitTreeNode[] {
  const mains = units.filter((u) => !u.parent_unit_id);
  const childrenByParent = new Map<string, Unit[]>();

  for (const unit of units) {
    if (!unit.parent_unit_id) continue;
    const list = childrenByParent.get(unit.parent_unit_id) ?? [];
    list.push(unit);
    childrenByParent.set(unit.parent_unit_id, list);
  }

  return mains.map((unit) => ({
    unit,
    children: childrenByParent.get(unit.id) ?? [],
  }));
}

export function flattenUnitTree(nodes: UnitTreeNode[]): Unit[] {
  const result: Unit[] = [];
  for (const node of nodes) {
    result.push(node.unit);
    result.push(...node.children);
  }
  return result;
}
