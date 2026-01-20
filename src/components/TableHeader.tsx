import { Badge, HStack, Heading } from '@chakra-ui/react'
import ThemeToggle from './ThemeToggle'

export default function TableHeader({ tableId }: { tableId: number | null }) {
  return (
    <HStack justifyContent="space-between" p={4} position="sticky" top={0} bg="var(--bg)" color="var(--fg)" borderBottomWidth="1px" borderColor="var(--border)" boxShadow="sm" zIndex={5}>
      <Heading size="md">CafePOS</Heading>
      <HStack gap={3}>
        <Badge colorPalette="teal" size="lg">
          Table {tableId ?? '?'}
        </Badge>
        <ThemeToggle />
      </HStack>
    </HStack>
  )
}
