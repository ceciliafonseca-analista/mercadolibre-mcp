# Changelog

Todas las versiones de `@traid/mercadolibre-mcp` en orden inverso.

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
