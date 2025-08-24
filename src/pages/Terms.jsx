import React from 'react'
import { Container, Heading, Text, VStack } from '@chakra-ui/react'
import { Helmet } from 'react-helmet-async'

export default function Terms() {
  return (
    <Container maxW="4xl" py={8}>
      <Helmet>
        <title>Terms of Use — Finance Toolkit</title>
        <meta name="description" content="Terms of Use for Finance Toolkit (financetool.net)." />
        <link rel="canonical" href="https://financetool.net/#/terms" />
      </Helmet>
      <Heading size="lg" mb={4}>Terms of Use</Heading>
      <VStack align="stretch" spacing={4} fontSize="sm">
        <Text>Effective Date: January 1, 2025</Text>
        <Text>Welcome to Finance Toolkit. By using our website (https://financetool.net), you agree to these terms.</Text>
        <Text><b>1. No Financial Advice:</b> Results are estimates only and do not constitute financial advice. Consult professionals before making financial decisions.</Text>
        <Text><b>2. Acceptable Use:</b> You agree not to use the site for unlawful purposes or misuse the calculators.</Text>
        <Text><b>3. Ads & Links:</b> We may display ads (Google AdSense) and affiliate links. We are not responsible for third‑party content.</Text>
        <Text><b>4. Disclaimer of Warranties:</b> Site is provided “as is,” without warranties. We do not guarantee accuracy or availability.</Text>
        <Text><b>5. Limitation of Liability:</b> Finance Toolkit is not liable for damages from use of the site.</Text>
        <Text><b>6. Governing Law:</b> Terms are governed by U.S. and Texas law.</Text>
        <Text><b>7. Contact:</b> info@nexagraphics.com</Text>
      </VStack>
    </Container>
  )
};