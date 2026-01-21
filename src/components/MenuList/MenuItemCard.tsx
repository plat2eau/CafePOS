import { Box, HStack, VStack, Text, Button } from '@chakra-ui/react'
import type { MenuItem } from '../../types/menu'
import { useCart } from '../../state/cartStore'
import QuantityStepper from '../Cart/QuantityStepper'

export default function MenuItemCard({ item, onAdd }: { item: MenuItem, onAdd?: (id: string) => void }) {
  const qty = useCart(s => s.items[item.id]?.qty ?? 0)
  const setQty = useCart(s => s.setQty)
  const remove = useCart(s => s.remove)
  const price = (item.priceCents / 100).toFixed(2)

  const handleChange = (q: number) => {
    if (q <= 0) remove(item.id)
    else setQty(item.id, q)
  }

  return (
    <Box className="frost-card" bg="var(--card-bg)" color="var(--fg)" borderWidth="1px" borderColor="var(--border)" borderRadius="md" p={3}>
      <HStack justify="space-between" align="start">
          <VStack align="start" gap={1}>
            <Text fontWeight="medium">{item.name}</Text>
            {item.description && (
              <HStack gap={2}>
                <Text fontSize="sm" color="var(--fg)" opacity={0.85} fontStyle="italic">
                  {item.description}
                </Text>
              </HStack>
            )}
            <Text fontWeight="semibold">₹{price}</Text>
          </VStack>
        {qty > 0 ? (
          <QuantityStepper value={qty} onChange={handleChange} />
        ) : (
          <Button size="sm" className="brand-btn" onClick={() => onAdd?.(item.id)}>Add</Button>
        )}
      </HStack>
    </Box>
  )
}
