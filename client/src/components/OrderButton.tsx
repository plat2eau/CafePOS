import { Button } from '@chakra-ui/react'
import { useCart } from '../state/cartStore'
import { useTableId } from '../hooks/useTableId'
import { fetchJson } from '../utils/api'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useToast } from '@chakra-ui/toast'

import type { Order } from '../types/order'

export default function OrderButton() {
  const tableId = useTableId()
  const itemsObj = useCart(s => s.items)
  const items = Object.values(itemsObj)
  const clear = useCart(s => s.clear)
  const orderNote = useCart(s => s.orderNote)

const navigate = useNavigate()
const toast = useToast()

const [isLoading, setIsLoading] = useState(false)

const placeOrder = async () => {
  if (isLoading) return
  if (!tableId) return
  setIsLoading(true)
  try {
    const payload = {
      items: items.map(i => ({ itemId: i.itemId, qty: i.qty })),
      note: orderNote || undefined
    }
    const res = await fetchJson('/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
      tableId
    }) as Order
    console.log('Order created:', res)
    toast({ title: 'Success', description: 'Order placed!', status: 'success', duration: 3000, isClosable: true })
    clear()
    useCart.getState().setOrderNote('')
    navigate(`/table/${tableId}/orders`)
  } catch (err: unknown) {
    console.error(err)
    const error = err as { status?: number }
    if (error.status === 401 || error.status === 403) {
      toast({ title: 'Session Expired', description: 'Please verify again.', status: 'warning', duration: 5000, isClosable: true })
      navigate(`/table/${tableId}`)
    } else {
      toast({ title: 'Error', description: 'Failed to place order. Please try again.', status: 'error', duration: 5000, isClosable: true })
    }
  } finally {
    setIsLoading(false)
  }
}

  const disabled = !tableId || items.length === 0

return (
  <Button mt={4} onClick={placeOrder} disabled={disabled} loading={isLoading} className="brand-btn">
    Place Order
  </Button>
)
}
