#!/usr/bin/env node

// MCP Server Mercado Libre — Streamable HTTP transport
// Substitui o supergateway+SSE por um servidor HTTP nativo compatível com mcp-remote

import express, { Request, Response } from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { randomUUID } from 'crypto'

// Tools TRAID
import { registerListProducts } from './tools/products.js'
import { registerGetOrders } from './tools/orders.js'
import { registerUpdatePrice } from './tools/pricing.js'
import { registerUpdateStock } from './tools/stock.js'
import { registerListQuestions, registerAnswerQuestion } from './tools/questions.js'
import { registerGetItemMetrics } from './tools/metrics.js'
import { registerManageAds } from './tools/ads.js'
import { registerGetReputation } from './tools/reputation.js'
import { registerSearchCompetitors } from './tools/competitors.js'
import { registerGetCategories } from './tools/categories.js'

// Proxy ao MCP oficial
import { registerUpstreamProxy } from './upstream-proxy.js'

const SKIP_UPSTREAM = process.env.ML_SKIP_UPSTREAM_PROXY === '1'

// Mapa de sessões ativas: sessionId → transport
const transports = new Map<string, StreamableHTTPServerTransport>()

async function createMcpServer(): Promise<McpServer> {
  const server = new McpServer({ name: 'mercadolibre', version: '1.1.0' })

  registerListProducts(server)
  registerGetOrders(server)
  registerUpdatePrice(server)
  registerUpdateStock(server)
  registerListQuestions(server)
  registerAnswerQuestion(server)
  registerGetItemMetrics(server)
  registerManageAds(server)
  registerGetReputation(server)
  registerSearchCompetitors(server)
  registerGetCategories(server)

  if (!SKIP_UPSTREAM) {
    const proxiedCount = await registerUpstreamProxy(server)
    console.error(`[ml-mcp] ${proxiedCount} tools oficiais registradas (official_*)`)
  }

  return server
}

const app = express()
app.use(express.json())

// Endpoint principal MCP — Streamable HTTP
app.all('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined

  try {
    if (sessionId && transports.has(sessionId)) {
      // Sessão existente: reutiliza o transport
      await transports.get(sessionId)!.handleRequest(req, res, req.body)
    } else {
      // Nova sessão: cria servidor e transport
      const server = await createMcpServer()
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      })

      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId)
          console.error(`[ml-mcp] Sessão encerrada: ${transport.sessionId}`)
        }
      }

      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)

      if (transport.sessionId) {
        transports.set(transport.sessionId, transport)
        console.error(`[ml-mcp] Nova sessão: ${transport.sessionId}`)
      }
    }
  } catch (error) {
    console.error('[ml-mcp] Erro ao processar requisição:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

// Health check para Railway
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sessions: transports.size })
})

// Rota raiz informativa
app.get('/', (_req, res) => {
  res.json({
    name: 'mercadolibre-mcp',
    version: '1.1.0',
    transport: 'streamable-http',
    endpoint: '/mcp',
  })
})

const PORT = parseInt(process.env.PORT || '8080', 10)

app.listen(PORT, '0.0.0.0', () => {
  console.error(`[ml-mcp] Streamable HTTP server rodando na porta ${PORT}`)
  console.error(`[ml-mcp] Endpoint MCP: http://0.0.0.0:${PORT}/mcp`)
})
