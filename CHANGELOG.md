# Changelog

Todas las versiones de `@nahuelalbornoz/mercadolibre-mcp` en orden inverso.

## [1.1.0] — 2026-05-28

### Added
- **Modo Supabase** (prioridad 0 en auth) — el `access_token` se lee de una tabla `oauth_tokens` (column `account_label`) en Supabase, ideal para setups multi-tenant donde n8n/cron persisten el token refresheado. Activa cuando hay `SUPABASE_URL` (o `NEXT_PUBLIC_SUPABASE_URL`) y `SUPABASE_SERVICE_KEY` (o `SUPABASE_SERVICE_ROLE_KEY`).
- **Upstream proxy** — al boot, conecta como cliente MCP al servidor oficial de Mercado Libre (`https://mcp.mercadolibre.com/mcp`) y re-registra sus tools con prefijo `official_`. Beneficio: el surface oficial queda siempre actualizado server-side sin re-build. Desactivable con `ML_SKIP_UPSTREAM_PROXY=1`.
- Nueva dep `@supabase/supabase-js ^2.106.2`.
- Nuevos archivos `src/token-store.ts` y `src/upstream-proxy.ts`.

### Changed
- Refactor de `src/auth.ts`: ahora delega a token-store cuando Supabase está configurado. Backwards-compat preservado — los modos 1 (`ML_ACCESS_TOKEN`) y 2 (auto-refresh con `ML_CLIENT_ID`/`SECRET`/`REFRESH_TOKEN`) siguen funcionando igual.
- Nombre del paquete oficial pasó a `@nahuelalbornoz/mercadolibre-mcp` (el scope `@traid` queda como referencia histórica).

### Failure modes
- Si el upstream oficial no es reachable al boot, las 11 tools TRAID arrancan igual y el server logea un warning a stderr.
- Si la row de `oauth_tokens` no existe o el `expires_at` ya pasó, el cliente igual usa el token pero advierte por stderr.

## [1.0.0] — 2026-04-18

### Added
- Release inicial con 11 tools (7 de lectura + 4 de escritura con write-back).
- OAuth2 con dos modos: token directo o auto-refresh con `ML_CLIENT_ID` + `ML_CLIENT_SECRET` + `ML_REFRESH_TOKEN`.
- Soporte para MLA (Argentina), MLM (México), MLB (Brasil) y resto de sitios Mercado Libre.
- Compatibilidad con Claude Code, Cursor, Continue y cualquier cliente MCP.
- SKILL.md con metadata para distribución en marketplaces.

### Tools (lectura)
- `list_products` — publicaciones del seller
- `get_orders` — órdenes con detalle
- `list_questions` — preguntas recibidas
- `get_item_metrics` — métricas de publicación
- `get_reputation` — reputación del vendedor
- `search_competitors` — competencia por keyword
- `get_categories` — árbol de categorías

### Tools (escritura / write-back)
- `update_price` — actualiza precio de una publicación
- `update_stock` — actualiza stock disponible
- `answer_question` — responde preguntas de potenciales compradores
- `manage_ads` — pausa/activa publicaciones y edita ads

### Notes
- Versión full con write-back — para subset read-only ver `@traid/mercadolibre-mcp-read`.
