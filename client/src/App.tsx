import { Box, Text, VStack, Image } from '@chakra-ui/react'
import TableHeader from './components/TableHeader'
import BottomTabs from './components/BottomTabs'
import { useTableId } from './hooks/useTableId'
import MenuList from './components/MenuList/MenuList'
import BottomActionBar from './components/BottomActionBar'
import GuestForm from './components/GuestForm'
import { getSession, isExpired } from './utils/tableSession'
import { useState } from 'react'
import { BRAND } from './config/brand'
import { useMenu } from './hooks/useMenu'

function VerifiedMenu() {
  const { data, isLoading, error } = useMenu()
  return (
    <>
      {isLoading && (
        <VStack align="stretch" gap={3}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} className="frost-card" borderWidth="1px" borderColor="var(--border)" bg="var(--card-bg)" borderRadius="md" p={3}>
              <Box h="16px" w="60%" bg="var(--border)" borderRadius="sm" mb={2} />
              <Box h="12px" w="80%" bg="var(--border)" borderRadius="sm" opacity={0.7} />
            </Box>
          ))}
        </VStack>
      )}
        {error && <Text color="var(--error)">Failed to load menu</Text>}
      {data && <MenuList data={data} />}
    </>
  )
}

export default function App() {
  const tableId = useTableId()
  const [verifiedTick, setVerifiedTick] = useState(0)
  return (
    <Box maxW="480px" mx="auto" h="100dvh" display="flex" flexDir="column" bg={{ base: 'transparent' }} position="relative" overflow="hidden">
      <Image src={BRAND.logoUrl} alt={BRAND.name} opacity={0.12} maxW="70%" maxH="70%" position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" pointerEvents="none" zIndex={0} objectFit="contain" style={{ WebkitTransform: 'translate(-50%, -50%)', willChange: 'transform, opacity' }} />
      <Box className="bg-blob" />
      <Box className="bg-blob-2" />
      <TableHeader tableId={tableId} />
      <Box p={4} flex="1" minH={0} overflowY="auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {!tableId && (
          <Text color="var(--error)">Invalid or missing table number</Text>
        )}
        {tableId && (() => {
          void verifiedTick
          const sess = getSession(tableId)
          if (!sess || isExpired(sess)) {
            return <GuestForm tableId={tableId} onVerified={() => setVerifiedTick((t) => t + 1)} />
          }
          return <VerifiedMenu />
        })()}
      </Box>
      <BottomActionBar />
      <BottomTabs />
    </Box>
  )
}
