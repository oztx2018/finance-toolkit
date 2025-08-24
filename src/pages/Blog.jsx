import React from 'react'
import { Box, Container, Heading, Text, VStack, Link as CLink } from '@chakra-ui/react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { POSTS } from '../post';

export default function Blog() {
  return (
    <Box>
      <Helmet>
        <title>Finance Toolkit Blog</title>
        <meta name="description" content="Guides and tips on loans, mortgages, currency exchange, and financial planning." />
        <link rel="canonical" href="https://financetool.net/#/blog" />
      </Helmet>
      <Container maxW="4xl" py={8}>
        <Heading size="lg" mb={2}>Blog</Heading>
        <Text color="gray.500" mb={6}>Guides, explanations, and how‑tos.</Text>
        <VStack align="stretch" spacing={6}>
          {POSTS.map(p => (
            <Box key={p.slug} borderWidth="1px" rounded="xl" p={4}>
              <Heading size="md" mb={1}>
                <CLink as={Link} to={`/blog/${p.slug}`}>{p.title}</CLink>
              </Heading>
              <Text fontSize="sm" color="gray.500">{p.date}</Text>
              <Text mt={2}>{p.excerpt}</Text>
            </Box>
          ))}
        </VStack>
      </Container>
    </Box>
  )
};