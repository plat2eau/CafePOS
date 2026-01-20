import { Box, Text, VStack } from '@chakra-ui/react'
import TableHeader from './components/TableHeader'
import BottomTabs from './components/BottomTabs'
import { useTableId } from './hooks/useTableId'
import { useMenu } from './hooks/useMenu'
import MenuList from './components/MenuList/MenuList'
import BottomActionBar from './components/BottomActionBar'
import OTPForm from './components/OTPForm'
import { getSession, isExpired } from './utils/tableSession'
import { useState } from 'react'

export default function App() {
  const tableId = useTableId()
  const { data, isLoading, error } = useMenu()
  const [verifiedTick, setVerifiedTick] = useState(0)
  return (
    <Box maxW="480px" mx="auto" h="100dvh" display="flex" flexDir="column" bg={{ base: 'transparent' }}>
      <TableHeader tableId={tableId} />
      <Box p={4} flex="1" minH={0} overflowY="auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {!tableId && (
          <Text color="red.500">Invalid or missing table number</Text>
        )}
        {tableId && (() => {
          void verifiedTick
          const sess = getSession(tableId)
          if (!sess || isExpired(sess)) {
            return <OTPForm tableId={tableId} onVerified={() => setVerifiedTick((t) => t + 1)} />
          }
          return (
            <>
              {isLoading && (
                <VStack align="stretch" gap={3}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Box key={i} borderWidth="1px" borderColor="var(--border)" bg="var(--card-bg)" borderRadius="md" p={3}>
                      <Box h="16px" w="60%" bg="var(--border)" borderRadius="sm" mb={2} />
                      <Box h="12px" w="80%" bg="var(--border)" borderRadius="sm" opacity={0.7} />
                    </Box>
                  ))}
                </VStack>
              )}
              {error && <Text color="red.500">Failed to load menu</Text>}
              {data && <MenuList data={data} />}
            </>
          )
        })()}
      </Box>
      <BottomActionBar />
      <BottomTabs />
    </Box>
  )
}
