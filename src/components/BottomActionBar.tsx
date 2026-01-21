import { Box, HStack, VStack, Text, Button, IconButton } from '@chakra-ui/react'
import { useState } from 'react'
import { useCart } from '../state/cartStore'
import { useTableId } from '../hooks/useTableId'

const toPrice = (cents: number) => `₹${(cents / 100).toFixed(2)}`

export default function BottomActionBar() {
  const itemsObj = useCart(s => s.items)
  const items = Object.values(itemsObj)
  const clear = useCart(s => s.clear)
  const tableId = useTableId()

  const subtotal = items.reduce((sum, it) => sum + it.priceCents * it.qty, 0)
  const count = items.reduce((sum, it) => sum + it.qty, 0)

  const [open, setOpen] = useState(false)

  const placeOrder = () => {
    if (!tableId || items.length === 0) return
    const order = {
      tableId,
      items: items.map(i => ({ itemId: i.itemId, name: i.name, priceCents: i.priceCents, qty: i.qty })),
      createdAt: new Date().toISOString(),
    }
    console.log('OrderDraft:', order)
    alert('Order placed! Check console for payload.')
    clear()
  }

  return (
    <Box borderTopWidth="1px" borderColor="var(--border)" bg="var(--bg)" color="var(--fg)" px={3} py={2}>
      <HStack justify="space-between" align="center">
        <VStack align="start" gap={0}>
          <Text fontWeight="semibold">Your selection</Text>
          <Text fontSize="sm" color="fg.muted">{count} item{count === 1 ? '' : 's'} • {toPrice(subtotal)}</Text>
        </VStack>
        <IconButton aria-label={open ? 'Hide details' : 'Show details'} variant="ghost" size="sm" onClick={() => setOpen(o => !o)}>
          <Text>{open ? '▲' : '▼'}</Text>
        </IconButton>
      </HStack>

      {open && (
        <VStack align="stretch" gap={1} mt={2}>
          {items.length === 0 && (
            <Text color="fg.muted" fontSize="sm">No items yet</Text>
          )}
          {items.map(it => (
            <HStack key={it.itemId} justify="space-between" align="center">
              <Box as="span" style={{ display: 'inline-block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Text as="span" fontSize="sm">{it.name}</Text>
              </Box>
              <HStack gap={2}>
                <Text fontSize="sm" color="fg.muted">{it.qty} × {toPrice(it.priceCents)}</Text>
                <Text fontSize="sm" fontWeight="semibold">{toPrice(it.priceCents * it.qty)}</Text>
              </HStack>
            </HStack>
          ))}
        </VStack>
      )}

      <HStack mt={3} gap={3}>
        <Button variant="ghost" flex={1} onClick={clear} disabled={items.length === 0}>
          Clear
        </Button>
        <Button flex={2} onClick={placeOrder} disabled={!tableId || items.length === 0} className="brand-btn">
          Place Order
        </Button>
      </HStack>
    </Box>
  )
}
