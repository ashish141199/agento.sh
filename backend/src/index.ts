import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import { authRoutes } from './routes/auth.routes'

const fastify = Fastify({
  logger: true,
})

/**
 * Register plugins
 */
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
})

await fastify.register(cookie, {
  secret: process.env.JWT_SECRET,
})

/**
 * Register routes
 */
await fastify.register(authRoutes)

/**
 * Health check route
 */
fastify.get('/health', async () => {
  return { status: 'ok' }
})

/**
 * Root route
 */
fastify.get('/', async () => {
  return { message: 'Agentoo API is running' }
})

/**
 * Start server
 */
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8000')
    await fastify.listen({ port, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
