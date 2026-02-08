import { Badge, HStack, Heading, Image, Box } from '@chakra-ui/react'
import ThemeToggle from './ThemeToggle'
import { BRAND } from '../config/brand'

export default function TableHeader({ tableId }: { tableId: number | null }) {
  return (
    <HStack justifyContent="space-between" p={4} position="sticky" top={0} bg="transparent" className="frost-header" color="var(--fg)" borderBottomWidth="0" boxShadow="none" zIndex={5}>
      <HStack gap={2} align="center">
        <Image src={BRAND.logoUrl} alt={BRAND.name} boxSize="28px" borderRadius="md" />
        <Heading size="md" className="brand-text-gradient">{BRAND.name}</Heading>
      </HStack>
      <HStack gap={3}>
        <Badge bg="var(--surface)" color="var(--fg)" borderWidth="1px" borderColor="var(--border)" size="lg">
          Table {tableId ?? '?'}
        </Badge>
        <ThemeToggle />
      </HStack>
      <Box position="absolute" bottom={0} left={0} right={0} height="2px" bg="var(--primary)" opacity={0.4} />
    </HStack>
  )
}
