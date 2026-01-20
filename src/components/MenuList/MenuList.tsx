import { VStack, Heading, Box } from '@chakra-ui/react'
import type { MenuData } from '../../types/menu'
import MenuItemCard from './MenuItemCard'
import { useCart } from '../../state/cartStore'

export default function MenuList({ data }: { data: MenuData }) {
  const add = useCart(s => s.addItem)
  return (
    <VStack align="stretch" gap={3}>
      {data.categories.map(cat => (
        <VStack key={cat.id} align="stretch" gap={2}>
          <Heading size="sm" py={2}>
            {cat.name}
          </Heading>
          {data.items.filter(i => i.categoryId === cat.id).map(item => (
            <MenuItemCard
              key={item.id}
              item={item}
              onAdd={(id) => add({ itemId: id, name: item.name, priceCents: item.priceCents })}
            />
          ))}
          <Box borderTopWidth="1px" />
        </VStack>
      ))}
    </VStack>
  )
}
