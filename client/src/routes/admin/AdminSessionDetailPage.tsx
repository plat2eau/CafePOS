import { Box, Button, HStack, Heading, Input, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminFetchJson } from '../../utils/adminApi'
import { createThrottledAdminWsHandler, useAdminWs } from '../../hooks/useAdminWs'

type TableSession = {
  sessionId: string
  tableId: string
  name: string
  phone: string
  createdAt: string
  lastActiveAt: string
}

type OrderItem = { itemId: string; name: string; qty: number; priceCents: number }
type Order = { id: string; tableId: string; sessionId?: string; createdAt: string; totalCents: number; items: OrderItem[]; note?: string }

const toPrice = (c: number) => `₹${(c / 100).toFixed(2)}`

export default function AdminSessionDetailPage() {
  const params = useParams()
  const tableId = params.tableId ? decodeURIComponent(params.tableId) : null
  const navigate = useNavigate()

  const [session, setSession] = useState<TableSession | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [shiftTo, setShiftTo] = useState('')
  const [clearReason, setClearReason] = useState<'PAYMENT_DONE' | 'OTHER'>('PAYMENT_DONE')
  const [clearNote, setClearNote] = useState('')

  const sessionId = useMemo(() => session?.sessionId || null, [session])

  const refresh = useCallback(async () => {
    if (!tableId) return
    setLoading(true)
    setError(null)
    try {
      const sessions = await adminFetchJson('/api/v1/admin/table-sessions') as TableSession[]
      const s = sessions.find(x => x.tableId === tableId) || null
      setSession(s)
      if (s?.sessionId) {
        const list = await adminFetchJson(`/api/v1/admin/orders?sessionId=${encodeURIComponent(s.sessionId)}`) as Order[]
        setOrders(list)
      } else {
        setOrders([])
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [tableId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useAdminWs(
    useMemo(() => createThrottledAdminWsHandler(() => { void refresh() }, 5000), [refresh])
  )

  const doShift = async () => {
    if (!tableId || !shiftTo.trim()) return
    setError(null)
    try {
      await adminFetchJson(`/api/v1/admin/table-sessions/${encodeURIComponent(tableId)}/shift`, {
        method: 'POST',
        body: JSON.stringify({ toTableId: shiftTo.trim() })
      })
      navigate(`/admin/sessions/${encodeURIComponent(shiftTo.trim())}`, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const doClear = async () => {
    if (!tableId) return
    if (clearReason === 'OTHER' && !clearNote.trim()) return
    setError(null)
    try {
      await adminFetchJson(`/api/v1/admin/table-sessions/${encodeURIComponent(tableId)}/clear`, {
        method: 'POST',
        body: JSON.stringify({ reason: clearReason, note: clearNote.trim() || undefined })
      })
      navigate('/admin/sessions', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const deleteOrder = async (orderId: string) => {
    setError(null)
    try {
      await adminFetchJson(`/api/v1/admin/orders/${encodeURIComponent(orderId)}`, { method: 'DELETE' })
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Box maxW="480px" mx="auto" p={4}>
      <HStack justify="space-between" mb={3}>
        <Heading size="md">Session • {tableId ?? '?'}</Heading>
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/sessions')}>Back</Button>
      </HStack>

      {error && <Text color="var(--error)" mb={2}>{error}</Text>}
      {loading ? (
        <Text>Loading...</Text>
      ) : !session ? (
        <Text color="var(--fg-muted)">No active session for this table.</Text>
      ) : (
        <>
          <Box className="frost-card" borderWidth="1px" borderColor="var(--border)" bg="var(--card-bg)" borderRadius="md" p={3} mb={4}>
            <Heading size="sm" mb={2}>Guest</Heading>
            <Text>{session.name} • {session.phone}</Text>
            <Text fontSize="sm" color="var(--fg-muted)">SessionId: {session.sessionId}</Text>
          </Box>

          <Box className="frost-card" borderWidth="1px" borderColor="var(--border)" bg="var(--card-bg)" borderRadius="md" p={3} mb={4}>
            <Heading size="sm" mb={3}>Actions</Heading>
            <VStack align="stretch" gap={2}>
              <HStack>
                <Input placeholder="Shift to tableId" value={shiftTo} onChange={(e) => setShiftTo(e.target.value)} />
                <Button onClick={doShift} disabled={!shiftTo.trim()}>Shift</Button>
              </HStack>

              <HStack>
                <Button
                  variant={clearReason === 'PAYMENT_DONE' ? 'solid' : 'outline'}
                  onClick={() => setClearReason('PAYMENT_DONE')}
                  size="sm"
                >
                  PAYMENT_DONE
                </Button>
                <Button
                  variant={clearReason === 'OTHER' ? 'solid' : 'outline'}
                  onClick={() => setClearReason('OTHER')}
                  size="sm"
                >
                  OTHER
                </Button>
              </HStack>
              <Input
                placeholder={clearReason === 'OTHER' ? 'Note (required)' : 'Note (optional)'}
                value={clearNote}
                onChange={(e) => setClearNote(e.target.value)}
              />
              <Button onClick={doClear} disabled={clearReason === 'OTHER' && !clearNote.trim()}>
                Clear session
              </Button>
            </VStack>
          </Box>

          <HStack justify="space-between" mb={2}>
            <Heading size="sm">Orders (this session)</Heading>
            <Button size="sm" variant="ghost" onClick={refresh}>Refresh</Button>
          </HStack>

          {sessionId && orders.length === 0 ? (
            <Text color="var(--fg-muted)">No orders yet.</Text>
          ) : (
            <VStack align="stretch" gap={3}>
              {orders.map(o => (
                <Box key={o.id} className="frost-card" borderWidth="1px" borderColor="var(--border)" bg="var(--card-bg)" borderRadius="md" p={3}>
                  <HStack justify="space-between">
                    <Text fontWeight="semibold">#{o.id}</Text>
                    <Text fontSize="sm" color="var(--fg-muted)">{new Date(o.createdAt).toLocaleString()}</Text>
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
                  <Button mt={2} size="sm" variant="outline" onClick={() => deleteOrder(o.id)}>
                    Delete order
                  </Button>
                </Box>
              ))}
            </VStack>
          )}
        </>
      )}
    </Box>
  )
}
