export declare function roundMoney(value: number): number;
export type ReceiptLinePricing = {
    quantity: number;
    purchase_price_ex_vat: number;
    sale_price_ex_vat: number;
    vat_rate: number;
};
export declare function calcReceiptLineTotals(line: ReceiptLinePricing): {
    purchaseEx: number;
    vatAmount: number;
    purchaseInc: number;
    saleInc: number;
};
export declare function calcReceiptTotals(lines: ReceiptLinePricing[]): {
    purchase_ex_vat: number;
    vat_amount: number;
    purchase_inc_vat: number;
    sale_inc_vat: number;
};
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export declare function calcPaymentStatus(amountPaid: number, totalDue: number): {
    status: PaymentStatus;
    remaining: number;
};
//# sourceMappingURL=warehousePricing.d.ts.map