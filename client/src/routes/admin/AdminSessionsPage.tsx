import { Box, Button, HStack, Heading, Input, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminFetchJson } from '../../utils/adminApi'
import { clearAdminSession, getAdminSession } from '../../utils/adminSession'
import { createThrottledAdminWsHandler, useAdminWs } from '../../hooks/useAdminWs'

type TableSession = {
  sessionId: string
  tableId: string
  name: string
  phone: string
  createdAt: string
  lastActiveAt: string
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<TableSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tableId, setTableId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const navigate = useNavigate()

  const role = useMemo(() => getAdminSession()?.role, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchJson('/api/v1/admin/table-sessions') as TableSession[]
      setSessions(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useAdminWs(
    useMemo(() => createThrottledAdminWsHandler(() => { void refresh() }, 5000), [refresh])
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  const logout = () => {
    clearAdminSession()
    navigate('/admin/login', { replace: true })
  }

  const createSession = async () => {
    setError(null)
    try {
      await adminFetchJson('/api/v1/admin/table-sessions', {
        method: 'POST',
        body: JSON.stringify({ tableId, name, phone: phone.replace(/\D/g, '') })
      })
      setTableId('')
      setName('')
      setPhone('')
      await refresh()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Box maxW="480px" mx="auto" p={4}>
      <HStack justify="space-between" mb={3}>
        <Heading size="md">Admin • Sessions</Heading>
        <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
      </HStack>

      <Box className="frost-card" borderWidth="1px" borderColor="var(--border)" bg="var(--card-bg)" borderRadius="md" p={3} mb={4}>
        <Heading size="sm" mb={3}>Create session</Heading>
        <VStack align="stretch" gap={2}>
          <Input placeholder="Table ID" value={tableId} onChange={(e) => setTableId(e.target.value)} />
          <Input placeholder="Guest name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Phone (10 digits)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button onClick={createSession} disabled={!tableId || !name || phone.replace(/\D/g, '').length !== 10}>
            Create
          </Button>
          {role && <Text fontSize="sm" color="var(--fg-muted)">Role: {role}</Text>}
        </VStack>
      </Box>

      <HStack justify="space-between" mb={2}>
        <Heading size="sm">Active</Heading>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>Refresh</Button>
      </HStack>

      {error && <Text color="var(--error)" mb={2}>{error}</Text>}
      {loading ? (
        <Text>Loading...</Text>
      ) : sessions.length === 0 ? (
        <Text color="var(--fg-muted)">No active sessions</Text>
      ) : (
        <VStack align="stretch" gap={3}>
          {sessions.map(s => (
            <Box
              key={s.sessionId}
              className="frost-card"
              borderWidth="1px"
              borderColor="var(--border)"
              bg="var(--card-bg)"
              borderRadius="md"
              p={3}
              onClick={() => navigate(`/admin/sessions/${encodeURIComponent(s.tableId)}`)}
              cursor="pointer"
            >
              <HStack justify="space-between">
                <Text fontWeight="semibold">{s.tableId}</Text>
                <Text fontSize="sm" color="var(--fg-muted)">{new Date(s.createdAt).toLocaleString()}</Text>
              </HStack>
              <Text>{s.name} • {s.phone}</Text>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  )
}
