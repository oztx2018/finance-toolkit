import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { Box, Container, Heading, Text, VStack, Link as CLink } from '@chakra-ui/react'
import { Helmet } from 'react-helmet-async'
import { POSTS } from '../post';

export default function Post() {
  const { slug } = useParams()
  const post = POSTS.find(p => p.slug === slug)
  if (!post) {
    return (
      <Container maxW="3xl" py={8}>
        <Heading size="md">Post not found</Heading>
        <CLink as={Link} to="/blog" color="purple.600">Back to Blog</CLink>
      </Container>
    )
  }
  return (
    <Box>
      <Helmet>
        <title>{post.title} — Finance Toolkit Blog</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={`https://financetool.net/#/blog/${post.slug}`} />
      </Helmet>
      <Container maxW="3xl" py={8}>
        <Heading size="lg" mb={2}>{post.title}</Heading>
        <Text fontSize="sm" color="gray.500" mb={6}>{post.date}</Text>
        <VStack align="stretch" spacing={4}>
          {post.paragraphs.map((para, i) => (
            <Text key={i}>{para}</Text>
          ))}
        </VStack>
        <CLink as={Link} to="/blog" color="purple.600" display="inline-block" mt={6}>← Back to Blog</CLink>
      </Container>
    </Box>
  )
}