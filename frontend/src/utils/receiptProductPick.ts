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
  desired_markup_percent?: number | null;
};

export function productToReceiptLineFields(product: WarehouseProduct): ReceiptLineDraftFields {
  const vatRate = Number(product.vat_rate ?? 21);
  const purchaseEx = product.purchase_price != null ? Number(product.purchase_price) : 0;
  const purchaseStr = product.purchase_price != null ? String(product.purchase_price) : '';
  const desiredMarkup =
    product.desired_markup_percent != null ? Number(product.desired_markup_percent) : null;
  const catalogSale = product.sale_price != null ? Number(product.sale_price) : null;

  let saleInc = catalogSale;
  let markup: number | null = null;

  if (purchaseEx > 0 && catalogSale != null) {
    markup = calcMarkupPercentFromSaleInc(purchaseEx, catalogSale, vatRate);
  } else if (purchaseEx > 0 && desiredMarkup != null) {
    markup = desiredMarkup;
    saleInc = calcSaleIncFromMarkup(purchaseEx, desiredMarkup, vatRate);
  }

  const markupForField = markup ?? desiredMarkup;

  return {
    product_id: product.id,
    quantity: '1',
    purchase_price: purchaseStr,
    markup_percent: markupForField != null ? String(markupForField) : '',
    sale_price: saleInc != null ? String(saleInc) : '',
    vat_rate: vatRate,
    desired_markup_percent: desiredMarkup,
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
