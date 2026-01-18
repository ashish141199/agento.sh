import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import { authRoutes } from './routes/auth.routes'
import { agentRoutes } from './routes/agents.routes'
import { modelRoutes } from './routes/models.routes'
import { chatRoutes } from './routes/chat.routes'
import { toolRoutes } from './routes/tools.routes'
import { publishRoutes } from './routes/publish.routes'

const fastify = Fastify({
  logger: true,
})

/**
 * Allow empty JSON bodies
 * By default, Fastify rejects requests with Content-Type: application/json but empty body
 */
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    const json = body ? JSON.parse(body as string) : {}
    done(null, json)
  } catch (err) {
    done(err as Error, undefined)
  }
})

/**
 * Register plugins
 */
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})

await fastify.register(cookie, {
  secret: process.env.JWT_SECRET,
})

/**
 * Register routes
 */
await fastify.register(authRoutes)
await fastify.register(agentRoutes)
await fastify.register(modelRoutes)
await fastify.register(chatRoutes)
await fastify.register(toolRoutes)
await fastify.register(publishRoutes)

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
