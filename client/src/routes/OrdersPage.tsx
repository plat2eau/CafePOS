import { Box, Heading, Text, VStack, HStack, Image, IconButton } from '@chakra-ui/react'
import { useToast } from '@chakra-ui/toast'
import { useNavigate } from 'react-router-dom'
import TableHeader from '../components/TableHeader'
import BottomTabs from '../components/BottomTabs'
import { useTableId } from '../hooks/useTableId'
import { getSession, isExpired } from '../utils/tableSession'
import { BRAND } from '../config/brand'
import { fetchJson } from '../utils/api'
import { useCallback, useEffect, useState } from 'react'
import { useSessionHeartbeat } from '../hooks/useSessionHeartbeat'

import type { Order } from '../types/order'


const toPrice = (c: number) => `₹${(c/100).toFixed(2)}`

export default function OrdersPage() {
  const tableId = useTableId()
  useSessionHeartbeat(tableId)
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const toast = useToast()

  const fetchOrders = useCallback(async () => {
    if (!tableId) return
    const sess = getSession(tableId)
    if (!sess || isExpired(sess)) {
      navigate(`/table/${tableId}`, { replace: true })
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchJson(`/api/v1/tables/${tableId}/orders`, { tableId })
      setOrders(data as Order[])
    } catch (err: unknown) {
      const error = err as { status?: number }
      if (error.status === 401 || error.status === 403) {
        toast({ title: 'Session Expired', description: 'Please verify again.', status: 'warning', duration: 5000, isClosable: true })
        navigate(`/table/${tableId}`)
      } else {
        setError('Failed to load orders. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [navigate, tableId, toast])

  useEffect(() => {
    fetchOrders()
  }, [tableId, navigate, fetchOrders])

  return (
    <Box maxW="480px" mx="auto" h="100dvh" display="flex" flexDir="column" bg={{ base: 'transparent' }} position="relative" overflow="hidden">
      <Image src={BRAND.logoUrl} alt={BRAND.name} opacity={0.12} maxW="70%" maxH="70%" position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" pointerEvents="none" zIndex={0} objectFit="contain" style={{ WebkitTransform: 'translate(-50%, -50%)', willChange: 'transform, opacity' }} />
      <Box className="bg-blob" />
      <Box className="bg-blob-2" />
      <TableHeader tableId={tableId} />
      <Box p={4} flex="1" minH={0} overflowY="auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <HStack justify="space-between" align="center" mb={3}>
          <Heading size="md">Past Orders</Heading>
          <IconButton aria-label="Refresh" variant="ghost" size="sm" onClick={fetchOrders} disabled={isLoading} >
            ↻
          </IconButton>
        </HStack>
        {error ? <Text color="var(--error)">{error}</Text> : isLoading ? <Text>Loading...</Text> : orders.length === 0 ? <Text color="var(--fg-muted)">No past orders</Text> : (
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
                    <Text fontSize="sm" color="var(--fg-muted)">Note</Text>
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
