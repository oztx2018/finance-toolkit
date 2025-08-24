import React from 'react'
import { Container, Heading, Text, VStack } from '@chakra-ui/react'
import { Helmet } from 'react-helmet-async'

export default function Privacy() {
  return (
    <Container maxW="4xl" py={8}>
      <Helmet>
        <title>Privacy Policy — Finance Toolkit</title>
        <meta name="description" content="Privacy Policy for Finance Toolkit (financetool.net)." />
        <link rel="canonical" href="https://financetool.net/#/privacy" />
      </Helmet>
      <Heading size="lg" mb={4}>Privacy Policy</Heading>
      <VStack align="stretch" spacing={4} fontSize="sm">
        <Text>Effective Date: January 1, 2025</Text>
        <Text>At Finance Toolkit (https://financetool.net), your privacy is very important to us. This Privacy Policy explains how we collect, use, and protect your information.</Text>
        <Text><b>1. Information We Collect:</b> We do not require user registration. If you contact us via email, we may collect your name, email, or other info. Third‑party vendors, including Google, use cookies to serve ads based on prior visits.</Text>
        <Text><b>2. How We Use Information:</b> To operate and improve our calculators, serve personalized ads (Google AdSense), and respond to inquiries.</Text>
        <Text><b>3. Third‑Party Services:</b> We use Google AdSense. See Google’s policies: https://policies.google.com/technologies/ads</Text>
        <Text><b>4. Data Security:</b> We implement reasonable safeguards but no method is 100% secure.</Text>
        <Text><b>5. Your Choices:</b> Disable cookies in your browser or manage ads at https://www.google.com/settings/ads/</Text>
        <Text><b>6. Children’s Privacy:</b> Our site is not directed to children under 13.</Text>
        <Text><b>7. Updates:</b> We may update this Privacy Policy. Updates will be posted with a new effective date.</Text>
        <Text><b>8. Contact:</b> info@nexagraphics.com</Text>
      </VStack>
    </Container>
  )
}