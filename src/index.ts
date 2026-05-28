#!/usr/bin/env node

// MCP Server Mercado Libre
// - 11 tools TRAID hand-coded (operaciones de seller)
// - Proxy al MCP oficial de ML (surface auto-actualizado, prefijo official_)
// - Token desde Supabase (multi-tenant) con fallback a ML_ACCESS_TOKEN env

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

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

// Proxy al MCP oficial
import { registerUpstreamProxy } from './upstream-proxy.js'

const server = new McpServer({
  name: 'mercadolibre',
  version: '1.1.0',
})

// Registrar las 11 tools TRAID (siempre disponibles, no dependen del upstream)
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

// Flag para skipear el proxy upstream (útil para tests offline)
const SKIP_UPSTREAM = process.env.ML_SKIP_UPSTREAM_PROXY === '1'

async function main() {
  // Registrar proxy upstream ANTES de conectar transport
  // (registro asíncrono, falla graceful si upstream down)
  let proxiedCount = 0
  if (!SKIP_UPSTREAM) {
    proxiedCount = await registerUpstreamProxy(server)
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error(
    `[ml-mcp] Server iniciado — 11 tools TRAID + ${proxiedCount} tools oficiales (official_*)` +
      (SKIP_UPSTREAM ? ' (proxy upstream skipeado por ML_SKIP_UPSTREAM_PROXY=1)' : '')
  )
}

main().catch((error) => {
  console.error('[ml-mcp] Error fatal:', error)
  process.exit(1)
})
