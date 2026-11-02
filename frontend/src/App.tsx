import { Box, Heading } from '@radix-ui/themes'

export default function App() {
  return (
    <Box asChild p="6">
      <main>
        <Heading as="h1" size="5">书签管理器</Heading>
      </main>
    </Box>
  )
}
