import { Box, Heading, Text, VStack, HStack } from '@chakra-ui/react'
import { useParams, Navigate } from 'react-router-dom'
import TableHeader from '../components/TableHeader'
import BottomTabs from '../components/BottomTabs'
import { useTableId } from '../hooks/useTableId'
import { getSession, isExpired } from '../utils/tableSession'

// simple mock orders
const mockOrders = [
  { id: 'o1', tableId: 1, createdAt: '2026-01-20T12:00:00Z', totalCents: 52000, items: [ { name: 'Espresso', qty: 2 }, { name: 'Croissant', qty: 1 } ] },
  { id: 'o2', tableId: 1, createdAt: '2026-01-20T13:10:00Z', totalCents: 38000, items: [ { name: 'Masala Chai', qty: 2 } ] },
  { id: 'o3', tableId: 1, createdAt: '2026-01-20T14:05:00Z', totalCents: 45000, items: [ { name: 'Cappuccino', qty: 1 }, { name: 'Veg Sandwich', qty: 1 } ] },
  { id: 'o4', tableId: 1, createdAt: '2026-01-20T15:22:00Z', totalCents: 16000, items: [ { name: 'Green Tea', qty: 1 } ] },
  { id: 'o5', tableId: 1, createdAt: '2026-01-20T16:47:00Z', totalCents: 70000, items: [ { name: 'Espresso', qty: 1 }, { name: 'Cappuccino', qty: 2 }, { name: 'Croissant', qty: 2 } ] },
  { id: 'o6', tableId: 1, createdAt: '2026-01-20T17:32:00Z', totalCents: 25000, items: [ { name: 'Veg Sandwich', qty: 1 } ] },
  { id: 'o7', tableId: 1, createdAt: '2026-01-20T18:10:00Z', totalCents: 30000, items: [ { name: 'Masala Chai', qty: 1 }, { name: 'Green Tea', qty: 1 } ] },
  { id: 'o8', tableId: 1, createdAt: '2026-01-20T19:05:00Z', totalCents: 20000, items: [ { name: 'Croissant', qty: 1 } ] },
  { id: 'o9', tableId: 1, createdAt: '2026-01-20T19:45:00Z', totalCents: 38000, items: [ { name: 'Masala Chai', qty: 2 } ] },
  { id: 'o10', tableId: 1, createdAt: '2026-01-20T20:30:00Z', totalCents: 52000, items: [ { name: 'Espresso', qty: 2 }, { name: 'Croissant', qty: 1 } ] },
  { id: 'o11', tableId: 1, createdAt: '2026-01-21T09:15:00Z', totalCents: 16000, items: [ { name: 'Green Tea', qty: 1 } ] },
  { id: 'o12', tableId: 1, createdAt: '2026-01-21T10:05:00Z', totalCents: 45000, items: [ { name: 'Cappuccino', qty: 1 }, { name: 'Veg Sandwich', qty: 1 } ] },
  { id: 'o13', tableId: 1, createdAt: '2026-01-21T10:55:00Z', totalCents: 18000, items: [ { name: 'Masala Chai', qty: 1 } ] },
  { id: 'o14', tableId: 1, createdAt: '2026-01-21T11:25:00Z', totalCents: 20000, items: [ { name: 'Croissant', qty: 1 } ] },
  { id: 'o15', tableId: 1, createdAt: '2026-01-21T12:40:00Z', totalCents: 70000, items: [ { name: 'Espresso', qty: 1 }, { name: 'Cappuccino', qty: 2 }, { name: 'Croissant', qty: 2 } ] }
]

const toPrice = (c: number) => `₹${(c/100).toFixed(2)}`

export default function OrdersPage() {
  const { tableId } = useParams()
  const tid = Number(tableId)
  const tableIdNum = useTableId()
  const orders = mockOrders.filter(o => o.tableId === tid)

  const sess = tableIdNum ? getSession(tableIdNum) : null
  if (tableIdNum && (!sess || isExpired(sess))) {
    return <Navigate to={`/table/${tableIdNum}`} replace />
  }

  return (
    <Box maxW="480px" mx="auto" h="100dvh" display="flex" flexDir="column" bg={{ base: 'transparent' }}>
      <TableHeader tableId={tableIdNum} />
      <Box p={4} flex="1" minH={0} overflowY="auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <Heading size="md" mb={3}>Past Orders</Heading>
        {orders.length === 0 && <Text color="fg.muted">No past orders</Text>}
        <VStack align="stretch" gap={3}>
          {orders.map(o => (
            <Box key={o.id} borderWidth="1px" borderColor="var(--border)" bg="var(--card-bg)" borderRadius="md" p={3}>
              <HStack justify="space-between">
                <Text fontWeight="semibold">#{o.id}</Text>
                <Text>{new Date(o.createdAt).toLocaleString()}</Text>
              </HStack>
              <VStack align="start" gap={1} mt={2}>
                {o.items.map((it, idx) => (
                  <Text key={idx}>{it.name} × {it.qty}</Text>
                ))}
              </VStack>
              <HStack justify="space-between" mt={2}>
                <Text>Total</Text>
                <Text fontWeight="semibold">{toPrice(o.totalCents)}</Text>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>
      <BottomTabs />
    </Box>
  )
}
