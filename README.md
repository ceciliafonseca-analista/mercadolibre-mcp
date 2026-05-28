# @nahuelalbornoz/mercadolibre-mcp

MCP server completo para Mercado Libre. 11 tools TRAID de operaciones de seller con write-back **+ proxy automático al MCP oficial de Mercado Libre** (siempre actualizado server-side). Para usar desde Claude Code, Cursor, o cualquier cliente MCP.

```bash
npx @nahuelalbornoz/mercadolibre-mcp
```

## Tools disponibles

| Tool | Descripción | Tipo |
|------|-------------|------|
| `list_products` | Lista productos/publicaciones de un vendedor | Lectura |
| `get_orders` | Obtiene órdenes/ventas con detalle | Lectura |
| `update_price` | Actualiza precio de una publicación | Escritura |
| `update_stock` | Actualiza stock de una publicación | Escritura |
| `list_questions` | Lista preguntas recibidas | Lectura |
| `answer_question` | Responde una pregunta | Escritura |
| `get_item_metrics` | Métricas: visitas, conversión, salud | Lectura |
| `manage_ads` | Gestiona Product Ads (activar/pausar/status) | Escritura |
| `get_reputation` | Reputación del vendedor | Lectura |
| `search_competitors` | Busca productos de la competencia | Lectura |
| `get_categories` | Categorías y atributos para publicar | Lectura |

## Setup

Tres modos de autenticación (en orden de prioridad — se elige el primero configurado):

### Opción A: Supabase (multi-tenant, **recomendado v1.1.0+**)

El `access_token` se lee de una tabla `oauth_tokens` en Supabase. Ideal cuando un cron externo (n8n, scheduled job) refresca y persiste el token. Soporta múltiples clientes / cuentas via el campo `account_label`.

Schema mínimo esperado:

```sql
create table oauth_tokens (
  account_label text primary key,    -- ej: 'miami', 'cliente_a', 'cliente_b'
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz,
  updated_at    timestamptz default now()
);
```

```json
{
  "mcpServers": {
    "mercadolibre": {
      "command": "npx",
      "args": ["-y", "@nahuelalbornoz/mercadolibre-mcp"],
      "env": {
        "SUPABASE_URL": "https://YOUR_PROJECT.supabase.co",
        "SUPABASE_SERVICE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}",
        "ML_ACCOUNT_LABEL": "miami",
        "ML_TOKEN_TABLE": "oauth_tokens",
        "ML_SITE_ID": "MLA"
      }
    }
  }
}
```

Aliases aceptados: `NEXT_PUBLIC_SUPABASE_URL` (en lugar de `SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY` (en lugar de `SUPABASE_SERVICE_KEY`). El service_role bypassea RLS.

### Opción B: Token directo (si tenés n8n/cron renovando el token)

```json
{
  "mcpServers": {
    "mercadolibre": {
      "command": "node",
      "args": ["path/to/mercadolibre-mcp/dist/index.js"],
      "env": {
        "ML_ACCESS_TOKEN": "APP_USR-...",
        "ML_SITE_ID": "MLA"
      }
    }
  }
}
```

### Opción C: Auto-refresh (standalone, sin dependencias externas)

1. Ir a [developers.mercadolibre.com](https://developers.mercadolibre.com)
2. Crear aplicación → obtener `CLIENT_ID` y `CLIENT_SECRET`
3. Autorizar vía OAuth → obtener `REFRESH_TOKEN`

```json
{
  "mcpServers": {
    "mercadolibre": {
      "command": "node",
      "args": ["path/to/mercadolibre-mcp/dist/index.js"],
      "env": {
        "ML_CLIENT_ID": "tu_client_id",
        "ML_CLIENT_SECRET": "tu_client_secret",
        "ML_REFRESH_TOKEN": "tu_refresh_token",
        "ML_SITE_ID": "MLA"
      }
    }
  }
}
```

### 3. Sites soportados

| Site ID | País |
|---------|------|
| MLA | Argentina |
| MLU | Uruguay |
| MLB | Brasil |
| MLC | Chile |
| MLM | México |
| MCO | Colombia |

## Uso

Una vez configurado, Claude Code puede ejecutar directamente:

- "Listame los productos activos"
- "Mostrá las órdenes de hoy"
- "Actualizá el precio de MLA123456 a $5000"
- "Qué preguntas sin responder tengo?"
- "Buscá competencia para repuestos de freno Toyota"

## Proxy al MCP oficial (auto-actualizado)

A partir de v1.1.0 el server, al arrancar, también conecta como cliente MCP al servidor oficial de Mercado Libre (`https://mcp.mercadolibre.com/mcp`) y re-registra todas sus tools con prefijo `official_`.

**Beneficio:** cuando ML agrega/cambia endpoints, los ves automáticamente sin re-buildear este paquete. Las 11 tools TRAID locales conviven y siempre tienen prioridad sobre el upstream.

**Failure mode:** si el upstream no es reachable al boot, se logea un warning y las 11 tools locales arrancan igual.

**Desactivar:** `ML_SKIP_UPSTREAM_PROXY=1` en el env (útil para tests offline).

## Características

- **OAuth2 auto-refresh**: El token se renueva automáticamente cada 6h (en modo C)
- **Token shared via Supabase**: Multi-tenant, renovado por cron externo (en modo A)
- **Upstream proxy**: surface oficial auto-actualizado server-side (v1.1.0+)
- **Rate limiting**: Retry automático con backoff ante límites de la API
- **Multi-get batching**: Consultas de múltiples items en lotes de 20
- **Errores en español**: Mensajes de error claros, no JSON crudo
- **Validación Zod**: Cada parámetro validado antes de llamar a la API

## Desarrollo

```bash
cd mcp-servers/mercadolibre
npm install
npm run build    # Compilar TypeScript
npm run dev      # Desarrollo con tsx
```

## Licencia

MIT
