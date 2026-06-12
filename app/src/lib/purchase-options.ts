export const purchaseUnits = ['kg', 'g', 'litre', 'ml', 'pcs', 'pack', 'box'] as const
export const purchasePaymentStatuses = ['unpaid', 'partial', 'paid'] as const
export const purchasePaymentMethods = ['cash', 'upi', 'card', 'bank_transfer', 'other'] as const

export type PurchaseUnit = (typeof purchaseUnits)[number]
export type PurchasePaymentStatus = (typeof purchasePaymentStatuses)[number]
export type PurchasePaymentMethod = (typeof purchasePaymentMethods)[number]

export function isPurchaseUnit(value: string): value is PurchaseUnit {
  return purchaseUnits.includes(value as PurchaseUnit)
}

export function isPurchasePaymentStatus(value: string): value is PurchasePaymentStatus {
  return purchasePaymentStatuses.includes(value as PurchasePaymentStatus)
}

export function isPurchasePaymentMethod(value: string): value is PurchasePaymentMethod {
  return purchasePaymentMethods.includes(value as PurchasePaymentMethod)
}
