export type OrderItem = {
  itemId: string;
  name: string;
  qty: number;
  priceCents: number;
}

export type Order = {
  id: string;
  tableId: number;
  createdAt: string;
  totalCents: number;
  items: OrderItem[];
  note?: string;
}