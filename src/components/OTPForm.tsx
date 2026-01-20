import { Box, Button, HStack, Input, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { setSession } from '../utils/tableSession'

export default function OTPForm({ tableId, onVerified }: { tableId: number, onVerified: () => void }) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const code = otp.replace(/\D/g, '')
    if (code.length !== 6) {
      setError('Enter the 6-digit code')
      return
    }
    setLoading(true)
    try {
      // Mock verify for now: accept '000000'
      await new Promise((r) => setTimeout(r, 250))
      if (code !== '000000') {
        throw new Error('Invalid code')
      }
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      setSession({ token: `mock_tbl_sess_${tableId}_${Date.now()}`, tableId, expiresAt })
      onVerified()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box px={4} py={6}>
      <form onSubmit={submit}>
        <Text mb={2}>Enter OTP to unlock table {tableId}</Text>
        <Input
          type="tel"
          inputMode="numeric"
          placeholder="••••••"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />
        {error && (
          <Text color="red.500" mt={2} fontSize="sm">{error}</Text>
        )}
        <HStack mt={4}>
          <Button type="submit" loading={loading} bg="var(--button-bg)" color="var(--button-fg)" flex={1}>
            Verify
          </Button>
        </HStack>
        <Text mt={2} color="fg.muted" fontSize="sm">Use 000000 in dev.</Text>
      </form>
    </Box>
  )
}
