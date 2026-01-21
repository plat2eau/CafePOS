import { HStack, Button, Box } from '@chakra-ui/react'
import { Link, useLocation, useParams } from 'react-router-dom'

export default function BottomTabs() {
  const { pathname } = useLocation()
  const { tableId } = useParams()
  const isOrders = pathname.endsWith('/orders')

  return (
    <Box borderTopWidth="1px" borderColor="var(--border)" mt="auto" bg="var(--bg)" color="var(--fg)" boxShadow="0 -2px 8px rgba(0,0,0,0.06)">
      <HStack p={0} m={0} gap={0} justify="stretch" align="stretch">
        <Button
          asChild
          variant="ghost"
          borderRadius={0}
          flex={1}
          py={3}
          className={!isOrders ? 'brand-btn' : undefined}
          bg={isOrders ? 'transparent' : undefined}
          color={isOrders ? 'var(--fg)' : undefined}
          _hover={{ bg: isOrders ? 'transparent' : undefined }}
        >
          <Link to={`/table/${tableId}`} style={{ color: 'inherit', textDecoration: 'none' }}>Menu</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          borderRadius={0}
          flex={1}
          py={3}
          className={isOrders ? 'brand-btn' : undefined}
          bg={isOrders ? undefined : 'transparent'}
          color={isOrders ? undefined : 'var(--fg)'}
          _hover={{ bg: isOrders ? undefined : 'transparent' }}
        >
          <Link to={`/table/${tableId}/orders`} style={{ color: 'inherit', textDecoration: 'none' }}>Orders</Link>
        </Button>
      </HStack>
    </Box>
  )
}
