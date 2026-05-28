// Upstream proxy — conecta al MCP server oficial de Mercado Libre
// y re-registra sus tools en el server local con prefijo 'official_'.
//
// Beneficio: el surface del MCP oficial se mantiene siempre actualizado
// (ML pushea cambios server-side) sin necesidad de re-buildear este fork.
//
// Failure mode: si el upstream no está reachable al boot, log warning y
// seguimos sin proxy. Las 11 tools TRAID locales arrancan igual.

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getAccessToken } from './auth.js'

const UPSTREAM_URL = 'https://mcp.mercadolibre.com/mcp'
const TOOL_PREFIX = 'official_'

interface UpstreamTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

// Schema permisivo: aceptamos cualquier shape y forwardeamos al upstream.
// El upstream valida con su propio schema. El JSON Schema real va embebido
// en la description para que el LLM cliente sepa qué pasar.
const passthroughSchema = z.object({}).passthrough()

async function buildClient(): Promise<Client | null> {
  let token: string
  try {
    token = await getAccessToken()
  } catch (err) {
    console.error(
      `[ml-mcp] upstream-proxy: no se pudo obtener access_token (${(err as Error).message}). ` +
        'El proxy oficial NO se activa, solo las tools TRAID locales estarán disponibles.'
    )
    return null
  }

  const transport = new StreamableHTTPClientTransport(new URL(UPSTREAM_URL), {
    requestInit: {
      headers: { Authorization: `Bearer ${token}` },
    },
  })

  const client = new Client(
    { name: 'mercadolibre-mcp-proxy', version: '1.1.0' },
    { capabilities: {} }
  )

  try {
    await client.connect(transport)
    return client
  } catch (err) {
    console.error(
      `[ml-mcp] upstream-proxy: error conectando a ${UPSTREAM_URL}: ${(err as Error).message}. ` +
        'El proxy oficial NO se activa, solo las tools TRAID locales estarán disponibles.'
    )
    return null
  }
}

export async function registerUpstreamProxy(server: McpServer): Promise<number> {
  const client = await buildClient()
  if (!client) return 0

  let upstreamTools: UpstreamTool[] = []
  try {
    const result = await client.listTools()
    upstreamTools = result.tools as UpstreamTool[]
  } catch (err) {
    console.error(
      `[ml-mcp] upstream-proxy: error listando tools: ${(err as Error).message}. Skipping.`
    )
    return 0
  }

  let registered = 0
  for (const tool of upstreamTools) {
    const proxiedName = `${TOOL_PREFIX}${tool.name}`

    // Embebemos el schema real en la description para que el LLM lo vea
    const schemaHint = tool.inputSchema
      ? `\n\n[Schema upstream — passar args que respeten esto]\n${JSON.stringify(tool.inputSchema, null, 2)}`
      : ''
    const description = `${tool.description || `Tool oficial ML: ${tool.name}`}${schemaHint}`

    try {
      server.registerTool(
        proxiedName,
        { description, inputSchema: passthroughSchema.shape },
        async (args: Record<string, unknown>) => {
          const response = await client.callTool({
            name: tool.name,
            arguments: args,
          })
          return response as never
        }
      )
      registered++
    } catch (err) {
      console.error(
        `[ml-mcp] upstream-proxy: error registrando ${proxiedName}: ${(err as Error).message}`
      )
    }
  }

  console.error(
    `[ml-mcp] upstream-proxy: ${registered} tools oficiales registradas con prefijo '${TOOL_PREFIX}'`
  )
  return registered
}
