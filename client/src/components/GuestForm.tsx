import { Box, Button, Input, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { fetchJson } from '../utils/api'
import { setSession } from '../utils/tableSession'

export default function GuestForm({ tableId, onVerified }: { tableId: string, onVerified: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const cleanPhone = phone.replace(/\D/g, '')
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid phone number')
      return
    }
    setLoading(true)
    try {
      const res = await fetchJson(`/api/v1/tables/${tableId}/guest/verify`, {
        method: 'POST',
        body: JSON.stringify({ name, phone: cleanPhone })
      })
      setSession({ name, phone: cleanPhone, tableId, expiresAt: res.expiresAt, token: res.token })
      onVerified()
    } catch (err) {
      setError((err as Error).message || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box px={4} py={6}>
      <form onSubmit={submit}>
        <VStack gap={4} align="stretch">
          <Box>
            <Text mb={2}>Name</Text>
            <Input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Box>
          <Box>
            <Text mb={2}>Phone Number</Text>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
            />
          </Box>
          {error && (
            <Text color="var(--error)" mt={2} fontSize="sm">{error}</Text>
          )}
          <Button type="submit" loading={loading} className="brand-btn" width="full">
            Submit
          </Button>
          <Text color="var(--fg-muted)" fontSize="sm">We'll use this to identify your orders.</Text>
        </VStack>
      </form>
    </Box>
  )
}
