import type { WarehouseItem, WarehouseMovement } from '../models/types';
import type { warehouseItemInputSchema, warehouseStockInSchema } from '../schemas/warehouse';
import type { z } from 'zod';
type ItemInput = z.infer<typeof warehouseItemInputSchema>;
type StockInInput = z.infer<typeof warehouseStockInSchema>;
export declare function listWarehouseItems(search?: string): Promise<WarehouseItem[]>;
export declare function getWarehouseItem(id: string): Promise<WarehouseItem | null>;
export declare function createWarehouseItem(input: ItemInput, createdBy?: string): Promise<WarehouseItem>;
export declare function updateWarehouseItem(id: string, input: Partial<ItemInput>): Promise<WarehouseItem>;
export declare function stockIn(itemId: string, input: StockInInput, createdBy?: string): Promise<WarehouseItem>;
export declare function consumeStock(itemId: string, quantity: number, referenceType: string, referenceId: string, createdBy?: string, notes?: string): Promise<void>;
export declare function returnStock(itemId: string, quantity: number, referenceType: string, referenceId: string, createdBy?: string): Promise<void>;
export declare function listMovements(itemId: string, limit?: number): Promise<WarehouseMovement[]>;
export {};
//# sourceMappingURL=warehouse.d.ts.map