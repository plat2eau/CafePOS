export type OrderItem = {
  itemId: string;
  name: string;
  qty: number;
  priceCents: number;
}

export type Order = {
  id: string;
  tableId: string;
  sessionId?: string;
  createdAt: string;
  totalCents: number;
  items: OrderItem[];
  note?: string;
}