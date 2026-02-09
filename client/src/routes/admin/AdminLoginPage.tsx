import { Box, Button, Heading, Input, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminFetchJson } from '../../utils/adminApi'
import { setAdminSession } from '../../utils/adminSession'

export default function AdminLoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetchJson('/api/v1/admin/login', {
        method: 'POST',
        body: JSON.stringify({ pin })
      }) as { token: string; role: 'admin' | 'staff' }
      setAdminSession({ token: res.token, role: res.role })
      navigate('/admin/sessions', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box maxW="480px" mx="auto" p={6}>
      <Heading size="md" mb={4}>Admin Login</Heading>
      <form onSubmit={submit}>
        <VStack align="stretch" gap={3}>
          <Input
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            type="password"
            inputMode="numeric"
          />
          {error && <Text color="var(--error)">{error}</Text>}
          <Button type="submit" loading={loading} className="brand-btn">Login</Button>
        </VStack>
      </form>
    </Box>
  )
}
