export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Vienības iepirkuma cena ar PVN */
export function purchaseUnitIncVat(purchaseExVat: number, vatRate: number): number {
  return roundMoney(purchaseExVat * (1 + vatRate / 100));
}

/** Pārdošanas cena ar PVN no iepirkuma (bez PVN) un piecenojuma % pēc PVN */
export function calcSaleIncFromMarkup(
  purchaseExVat: number,
  markupPercent: number,
  vatRate: number
): number {
  const purchaseInc = purchaseUnitIncVat(purchaseExVat, vatRate);
  return roundMoney(purchaseInc * (1 + markupPercent / 100));
}

/** Piecenojums %, ja pārdošanas cena ir ar PVN */
export function calcMarkupPercentFromSaleInc(
  purchaseExVat: number,
  saleIncVat: number,
  vatRate: number
): number | null {
  const purchaseInc = purchaseUnitIncVat(purchaseExVat, vatRate);
  if (!purchaseInc) return null;
  return roundMoney(((saleIncVat - purchaseInc) / purchaseInc) * 100);
}

export function calcProductMarkup(
  purchasePrice?: number | null,
  salePrice?: number | null,
  vatRate = 21
): number | null {
  if (purchasePrice == null || salePrice == null) return null;
  return calcMarkupPercentFromSaleInc(Number(purchasePrice), Number(salePrice), vatRate);
}

export type ReceiptLinePricing = {
  quantity: number;
  purchase_price_ex_vat: number;
  /** Vienības pārdošanas cena ar PVN */
  sale_price_inc_vat: number;
  vat_rate: number;
};

export type ReceiptTotals = {
  purchase_ex_vat: number;
  vat_amount: number;
  purchase_inc_vat: number;
  sale_inc_vat: number;
};

export function calcReceiptLineTotals(line: ReceiptLinePricing) {
  const qty = Number(line.quantity) || 0;
  const purchase = Number(line.purchase_price_ex_vat) || 0;
  const saleIncUnit = Number(line.sale_price_inc_vat) || 0;
  const vatRate = Number(line.vat_rate) || 21;
  const purchaseEx = roundMoney(qty * purchase);
  const vatAmount = roundMoney(purchaseEx * (vatRate / 100));
  const purchaseInc = roundMoney(purchaseEx + vatAmount);
  const saleInc = roundMoney(qty * saleIncUnit);
  return { purchaseEx, vatAmount, purchaseInc, saleInc };
}

export function calcReceiptTotals(lines: ReceiptLinePricing[]): ReceiptTotals {
  return lines.reduce(
    (acc, line) => {
      const row = calcReceiptLineTotals(line);
      acc.purchase_ex_vat = roundMoney(acc.purchase_ex_vat + row.purchaseEx);
      acc.vat_amount = roundMoney(acc.vat_amount + row.vatAmount);
      acc.purchase_inc_vat = roundMoney(acc.purchase_inc_vat + row.purchaseInc);
      acc.sale_inc_vat = roundMoney(acc.sale_inc_vat + row.saleInc);
      return acc;
    },
    { purchase_ex_vat: 0, vat_amount: 0, purchase_inc_vat: 0, sale_inc_vat: 0 }
  );
}

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export function calcPaymentStatus(
  amountPaid: number,
  totalDue: number
): { status: PaymentStatus; remaining: number } {
  const paid = roundMoney(Number(amountPaid) || 0);
  const due = roundMoney(Number(totalDue) || 0);
  if (due <= 0 || paid <= 0) {
    return {
      status: paid >= due && due > 0 ? 'paid' : 'unpaid',
      remaining: roundMoney(Math.max(due - paid, 0)),
    };
  }
  if (paid >= due) return { status: 'paid', remaining: 0 };
  if (paid > 0) return { status: 'partial', remaining: roundMoney(due - paid) };
  return { status: 'unpaid', remaining: due };
}

export function paymentStatusLabel(status: PaymentStatus): string {
  if (status === 'paid') return 'Apmaksāta';
  if (status === 'partial') return 'Daļēji apmaksāta';
  return 'Nav apmaksāta';
}

export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('lv-LV', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatQuantity(value: number | string | null | undefined, decimals = 2): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('lv-LV', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
