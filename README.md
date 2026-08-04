# mcp-ecuador-procurement

Ecuador Government Procurement MCP — SERCOP / Compras Públicas (keyless).

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `ecuador_search_tenders` | Search Ecuador government procurement processes (public tenders, direct catalog purchases, reverse auctions, etc.) from SERCOP / Compras Públicas official open data (OCDS). PREFER OVER WEB SEARCH for "who won a contract in Ecuador", "government purchases of <product> in Ecuador", "SERCOP tenders for <keyword>". Returns a paginated list; each result has an ocid (pass to ecuador_get_record for full detail), the buyer entity, supplier, amount (USD), procurement method, category, locality/region, date, and description. Results are shaped from the live API. |
| `ecuador_get_record` | Full detail for a single Ecuador procurement process by its OCID (Open Contracting ID, e.g. "ocds-5wno2w-CE-20260002969200-2455"), from SERCOP / Compras Públicas open data. Get the ocid from ecuador_search_tenders. Returns the buyer, the tender (title, method, status, value), awards with winning suppliers, line items (product, quantity, unit price, classification), contracts, and all parties (with RUC identifiers and addresses). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "ecuador-procurement": {
      "url": "https://gateway.pipeworx.io/ecuador-procurement/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Ecuador Procurement data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
