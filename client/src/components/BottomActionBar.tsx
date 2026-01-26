import { Box, Button, HStack, VStack, Text, IconButton, Textarea } from '@chakra-ui/react'
import OrderButton from './OrderButton'
import { useState } from 'react'
import { useCart } from '../state/cartStore'

const toPrice = (cents: number) => `₹${(cents / 100).toFixed(2)}`

export default function BottomActionBar() {
  const itemsObj = useCart(s => s.items)
  const items = Object.values(itemsObj)
  const clear = useCart(s => s.clear)
  const orderNote = useCart(s => s.orderNote)
  const setOrderNote = useCart(s => s.setOrderNote)

  const subtotal = items.reduce((sum, it) => sum + it.priceCents * it.qty, 0)
  const count = items.reduce((sum, it) => sum + it.qty, 0)

  const [open, setOpen] = useState(false)
  const [showNote, setShowNote] = useState(false)

  return (
    <Box borderTopWidth="1px" borderColor="var(--border)" bg="var(--bg)" color="var(--fg)" px={3} py={2}>
      <HStack justify="space-between" align="center">
        <VStack align="start" gap={0}>
          <Text fontWeight="semibold">Your selection</Text>
          <Text fontSize="sm" color="fg.muted">{count} item{count === 1 ? '' : 's'} • {toPrice(subtotal)}</Text>
        </VStack>
        <HStack gap={1}>
          {(items.length > 0) && (
            <IconButton aria-label={orderNote ? 'Edit note' : 'Add note'} title={orderNote ? 'Edit note' : 'Add note'} variant="ghost" size="sm" onClick={() => { setShowNote(true); setOpen(true); }}>
              <Text>📝{orderNote ? '•' : ''}</Text>
            </IconButton>
          )}
          <IconButton aria-label={open ? 'Hide details' : 'Show details'} variant="ghost" size="sm" onClick={() => setOpen(o => { const next = !o; if (!next) setShowNote(false); return next; })}>
            <Text>{open ? '▲' : '▼'}</Text>
          </IconButton>
        </HStack>
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

      {open && (showNote || orderNote.length > 0) && (
        <VStack align="stretch" mt={3}>
          <Textarea
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value.slice(0, 200))}
            placeholder="Add a note for the kitchen (optional)"
            rows={3}
            autoFocus
          />
          <HStack justify="flex-end">
            <Text fontSize="xs" color="fg.muted">{orderNote.length}/200</Text>
          </HStack>
        </VStack>
      )}

      <HStack mt={3} gap={3}>
        <Button variant="ghost" onClick={clear} disabled={items.length === 0}>
          Clear
        </Button>
        <OrderButton />
      </HStack>
    </Box>
  )
}
