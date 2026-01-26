import { Button } from '@chakra-ui/react'
import { useCart } from '../state/cartStore'
import { useTableId } from '../hooks/useTableId'
import { fetchJson } from '../utils/api'

export default function OrderButton() {
  const tableId = useTableId()
  const itemsObj = useCart(s => s.items)
  const items = Object.values(itemsObj)
  const clear = useCart(s => s.clear)
  const orderNote = useCart(s => s.orderNote)

  const placeOrder = async () => {
    if (!tableId) return
    try {
      const payload = {
        items: items.map(i => ({ itemId: i.itemId, qty: i.qty })),
        note: orderNote || undefined
      }
      const res = await fetchJson('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
        tableId
      })
      console.log('Order created:', res)
      alert('Order placed!')
      clear()
    } catch (err) {
      console.error(err)
      alert('Failed to place order')
    }
  }

  const disabled = !tableId || items.length === 0

  return (
    <Button mt={4} onClick={placeOrder} disabled={disabled} className="brand-btn">
      Place Order
    </Button>
  )
}
