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
          variant={isOrders ? 'ghost' : 'solid'}
          borderRadius={0}
          flex={1}
          py={3}
          bg={isOrders ? 'transparent' : 'var(--button-bg)'}
          color={isOrders ? 'var(--fg)' : 'var(--button-fg)'}
          _hover={{ bg: isOrders ? 'transparent' : 'var(--button-bg)' }}
        >
          <Link to={`/table/${tableId}`} style={{ color: 'inherit', textDecoration: 'none' }}>Menu</Link>
        </Button>
        <Button
          asChild
          variant={isOrders ? 'solid' : 'ghost'}
          borderRadius={0}
          flex={1}
          py={3}
          bg={isOrders ? 'var(--button-bg)' : 'transparent'}
          color={isOrders ? 'var(--button-fg)' : 'var(--fg)'}
          _hover={{ bg: isOrders ? 'var(--button-bg)' : 'transparent' }}
        >
          <Link to={`/table/${tableId}/orders`} style={{ color: 'inherit', textDecoration: 'none' }}>Orders</Link>
        </Button>
      </HStack>
    </Box>
  )
}
