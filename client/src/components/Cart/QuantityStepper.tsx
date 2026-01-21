import { HStack, IconButton, Input } from '@chakra-ui/react'

export default function QuantityStepper({
  value,
  onChange,
}: {
  value: number
  onChange: (next: number) => void
}) {
  const dec = () => onChange(Math.max(0, value - 1))
  const inc = () => onChange(value + 1)

  return (
    <HStack>
      <IconButton aria-label="decrement" size="xs" onClick={dec}>-</IconButton>
      <Input size="xs" width="48px" textAlign="center" value={value} readOnly />
      <IconButton aria-label="increment" size="xs" onClick={inc}>+</IconButton>
    </HStack>
  )
}
