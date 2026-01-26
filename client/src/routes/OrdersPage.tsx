import { Box, Heading, Text, VStack, HStack, Image } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import TableHeader from '../components/TableHeader'
import BottomTabs from '../components/BottomTabs'
import { useTableId } from '../hooks/useTableId'
import { getSession, isExpired } from '../utils/tableSession'
import { BRAND } from '../config/brand'
import { fetchJson } from '../utils/api'
import { useEffect, useState } from 'react'

// types
 type OrderItem = { name: string; qty: number }
 type Order = { id: string; tableId: number; createdAt: string; totalCents: number; items: OrderItem[]; note?: string }

const toPrice = (c: number) => `₹${(c/100).toFixed(2)}`

export default function OrdersPage() {
  const tableIdNum = useTableId()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!tableIdNum) return
    const sess = getSession(tableIdNum)
    if (!sess || isExpired(sess)) {
      navigate(`/table/${tableIdNum}`, { replace: true })
      return
    }
    fetchJson(`/api/v1/tables/${tableIdNum}/orders`, { tableId: tableIdNum })
      .then(data => {
        setOrders(data as Order[])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [tableIdNum, navigate])

  return (
    <Box maxW="480px" mx="auto" h="100dvh" display="flex" flexDir="column" bg={{ base: 'transparent' }} position="relative" overflow="hidden">
      <Image src={BRAND.logoUrl} alt={BRAND.name} opacity={0.12} maxW="70%" maxH="70%" position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" pointerEvents="none" zIndex={0} objectFit="contain" style={{ WebkitTransform: 'translate(-50%, -50%)', willChange: 'transform, opacity' }} />
      <Box className="bg-blob" />
      <Box className="bg-blob-2" />
      <TableHeader tableId={tableIdNum} />
      <Box p={4} flex="1" minH={0} overflowY="auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <Heading size="md" mb={3}>Past Orders</Heading>
        {isLoading ? <Text>Loading...</Text> : orders.length === 0 ? <Text color="fg.muted">No past orders</Text> : (
          <VStack align="stretch" gap={3}>
            {orders.map(o => (
              <Box key={o.id} className="frost-card" borderWidth="1px" borderColor="var(--border)" bg="var(--card-bg)" borderRadius="md" p={3}>
                <HStack justify="space-between">
                  <Text fontWeight="semibold">#{o.id}</Text>
                  <Text>{new Date(o.createdAt).toLocaleString()}</Text>
                </HStack>
                <VStack align="start" gap={1} mt={2}>
                  {o.items.map((it, idx) => (
                    <Text key={idx}>{it.name} × {it.qty}</Text>
                  ))}
                </VStack>
                {o.note && (
                  <Box mt={2}>
                    <Text fontSize="sm" color="fg.muted">Note</Text>
                    <Text fontSize="sm">{o.note}</Text>
                  </Box>
                )}
                <HStack justify="space-between" mt={2}>
                  <Text>Total</Text>
                  <Text fontWeight="semibold">{toPrice(o.totalCents)}</Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
      <BottomTabs />
    </Box>
  )
}
