import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <Box p={8} textAlign="center">
      <VStack gap={4} align="center">
        <Heading size="lg">404 Not Found</Heading>
        <Text>We couldn't find that page.</Text>
        <Button asChild colorPalette="teal">
          <Link to="/table/1">Go to a sample table</Link>
        </Button>
      </VStack>
    </Box>
  )
}
