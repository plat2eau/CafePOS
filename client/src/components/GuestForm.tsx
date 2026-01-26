import { Box, Button, Input, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { setSession } from '../utils/tableSession'

export default function GuestForm({ tableId, onVerified }: { tableId: number, onVerified: () => void }) {
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
      // Mock submission
      await new Promise((r) => setTimeout(r, 250))
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      setSession({ name, phone: cleanPhone, tableId, expiresAt })
      onVerified()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed'
      setError(msg)
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
            <Text color="red.500" mt={2} fontSize="sm">{error}</Text>
          )}
          <Button type="submit" loading={loading} className="brand-btn" width="full">
            Submit
          </Button>
          <Text color="fg.muted" fontSize="sm">We'll use this to identify your orders.</Text>
        </VStack>
      </form>
    </Box>
  )
}
