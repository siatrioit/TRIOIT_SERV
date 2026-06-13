import type { WarehouseProduct } from '../api/warehouseCommercial';
import {
  calcMarkupPercentFromSaleInc,
  calcSaleIncFromMarkup,
} from './warehousePricing';

export const RECEIPT_PRODUCT_PICK_MESSAGE = 'trio-warehouse-receipt-product-pick';
const STORAGE_KEY = 'warehouse-receipt-product-pick';

export type ReceiptProductPickPayload = {
  receiptId: string;
  lineIdx?: number;
  product: WarehouseProduct;
};

export type ReceiptLineDraftFields = {
  product_id: string;
  quantity: string;
  purchase_price: string;
  markup_percent: string;
  sale_price: string;
  vat_rate: number;
};

export function productToReceiptLineFields(product: WarehouseProduct): ReceiptLineDraftFields {
  const vatRate = Number(product.vat_rate ?? 21);
  const purchaseEx = product.purchase_price != null ? Number(product.purchase_price) : 0;
  const purchaseStr = product.purchase_price != null ? String(product.purchase_price) : '';
  const saleInc =
    product.sale_price != null
      ? Number(product.sale_price)
      : purchaseEx > 0
        ? calcSaleIncFromMarkup(purchaseEx, 0, vatRate)
        : null;
  const saleStr = saleInc != null ? String(saleInc) : '';
  const markup =
    purchaseEx > 0 && saleInc != null
      ? calcMarkupPercentFromSaleInc(purchaseEx, saleInc, vatRate)
      : null;

  return {
    product_id: product.id,
    quantity: '1',
    purchase_price: purchaseStr,
    markup_percent: markup != null ? String(markup) : '',
    sale_price: saleStr,
    vat_rate: vatRate,
  };
}

export function storeReceiptProductPick(payload: ReceiptProductPickPayload): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function consumeReceiptProductPick(receiptId: string): ReceiptProductPickPayload | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as ReceiptProductPickPayload;
    if (data.receiptId !== receiptId) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    return data;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function postReceiptProductPick(
  receiptId: string,
  lineIdx: number | undefined,
  product: WarehouseProduct
): boolean {
  if (typeof window === 'undefined') return false;
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(
      { type: RECEIPT_PRODUCT_PICK_MESSAGE, receiptId, lineIdx, product },
      window.location.origin
    );
    window.close();
    return true;
  }
  return false;
}
