import { Button } from '@chakra-ui/react'
import { useCart } from '../state/cartStore'
import { useTableId } from '../hooks/useTableId'

export default function OrderButton() {
  const tableId = useTableId()
  const itemsObj = useCart(s => s.items)
  const items = Object.values(itemsObj)
  const clear = useCart(s => s.clear)

  const placeOrder = () => {
    if (!tableId) return
    const order = {
      tableId,
      items: items.map(i => ({ itemId: i.itemId, name: i.name, priceCents: i.priceCents, qty: i.qty })),
      createdAt: new Date().toISOString(),
    }
    console.log('OrderDraft:', order)
    alert('Order placed! Check console for payload.')
    clear()
  }

  const disabled = !tableId || items.length === 0

  return (
    <Button mt={4} onClick={placeOrder} disabled={disabled} className="brand-btn">
      Place Order
    </Button>
  )
}
