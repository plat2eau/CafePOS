import { Box, HStack, Heading, Text, VStack } from '@chakra-ui/react'
import { useCart } from '../../state/cartStore'
import QuantityStepper from './QuantityStepper'

const toPrice = (cents: number) => `₹${(cents / 100).toFixed(2)}`

export default function CartSummary() {
  const itemsObj = useCart(s => s.items)
  const items = Object.values(itemsObj)
  const setQty = useCart(s => s.setQty)
  const remove = useCart(s => s.remove)
  const subtotal = items.reduce((sum, it) => sum + it.priceCents * it.qty, 0)

  if (items.length === 0) {
    return (
      <Box mt={6}>
        <Heading size="sm" mb={2}>Your Order</Heading>
        <Text color="fg.muted">No items yet</Text>
      </Box>
    )
  }

  return (
    <Box mt={6}>
      <Heading size="sm" mb={2}>Your Order</Heading>
      <VStack align="stretch" gap={3}>
        {items.map(it => (
          <HStack key={it.itemId} justify="space-between" align="center">
            <VStack align="start" gap={0}>
              <Text>{it.name}</Text>
              <Text color="fg.muted" fontSize="sm">{toPrice(it.priceCents)}</Text>
            </VStack>
            <HStack gap={3}>
              <QuantityStepper value={it.qty} onChange={(q) => q === 0 ? remove(it.itemId) : setQty(it.itemId, q)} />
              <Text minW="64px" textAlign="right">{toPrice(it.priceCents * it.qty)}</Text>
            </HStack>
          </HStack>
        ))}
        <HStack justify="space-between" pt={2} borderTopWidth="1px">
          <Text fontWeight="semibold">Subtotal</Text>
          <Text fontWeight="semibold">{toPrice(subtotal)}</Text>
        </HStack>
      </VStack>
    </Box>
  )
}
