# Claude MCP Trello

A Model Context Protocol (MCP) server that provides tools for interacting with Trello boards. This server enables seamless integration with Trello's API while handling rate limiting, type safety, and error handling automatically.

<a href="https://glama.ai/mcp/servers/7vcnchsm63">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/7vcnchsm63/badge" alt="Claude Trello MCP server" />
</a>

## Features

- **Full Trello Board Integration**: Interact with cards, lists, and board activities  
- **Built-in Rate Limiting**: Respects Trello's API limits (300 requests/10s per API key, 100 requests/10s per token)  
- **Type-Safe Implementation**: Written in TypeScript with comprehensive type definitions  
- **Input Validation**: Robust validation for all API inputs  
- **Error Handling**: Graceful error handling with informative messages  

## Available Tools

### `trello_get_cards_by_list`
Retrieves a list of cards contained in the specified list ID.

```typescript
{
  name: "trello_get_cards_by_list",
  arguments: {
    listId: string; // Trello list ID
  }
}
```

### `trello_get_lists`
Retrieves all lists in the board.

```typescript
{
  name: "trello_get_lists",
  arguments: {}
}
```

### `trello_get_recent_activity`
Retrieves the most recent board activity. The `limit` argument can specify how many to retrieve (default: 10).

```typescript
{
  name: "trello_get_recent_activity",
  arguments: {
    limit?: number; // Optional: number of activities to retrieve
  }
}
```

### `trello_add_card`
Adds a card to the specified list.

```typescript
{
  name: "trello_add_card",
  arguments: {
    listId: string;       // The ID of the list to add to
    name: string;         // The title of the card
    description?: string; // Optional: details of the card
    dueDate?: string;     // Optional: due date (e.g., ISO8601)
    labels?: string[];    // Optional: array of label IDs
  }
}
```

### `trello_update_card`
Updates the content of a card.

```typescript
{
  name: "trello_update_card",
  arguments: {
    cardId: string;       // The ID of the card to be updated
    name?: string;        // Optional: updated title
    description?: string; // Optional: updated description
    dueDate?: string;     // Optional: updated due date (e.g., ISO8601)
    labels?: string[];    // Optional: updated array of label IDs
  }
}
```

### `trello_archive_card`
Archives (closes) the specified card.

```typescript
{
  name: "trello_archive_card",
  arguments: {
    cardId: string; // The ID of the card to archive
  }
}
```

### `trello_add_list`
Adds a new list to the board.

```typescript
{
  name: "trello_add_list",
  arguments: {
    name: string; // Name of the new list
  }
}
```

### `trello_archive_list`
Archives (closes) the specified list.

```typescript
{
  name: "trello_archive_list",
  arguments: {
    listId: string; // The ID of the list to archive
  }
}
```

### `trello_get_my_cards`
Retrieves all cards related to your account.

```typescript
{
  name: "trello_get_my_cards",
  arguments: {}
}
```

### `trello_search_all_boards`
Performs a cross-board search across all boards in the workspace (organization), depending on plan/permissions.

```typescript
{
  name: "trello_search_all_boards",
  arguments: {
    query: string;   // Search keyword
    limit?: number;  // Optional: max number of results (default: 10)
  }
}
```

## Rate Limiting

The server implements a token bucket algorithm for rate limiting to comply with Trello's API limits:
- 300 requests per 10 seconds per API key
- 100 requests per 10 seconds per token

Rate limiting is handled automatically, and requests will be queued if limits are reached.

## Error Handling

The server provides detailed error messages for various scenarios:
- Invalid input parameters
- Rate limit exceeded
- API authentication errors
- Network issues
- Invalid board/list/card IDs

## Development

### Prerequisites

- Node.js 16 or higher  
- npm or yarn  

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/hrs-asano/claude-mcp-trello.git
   cd claude-mcp-trello
   ```

2.	Install dependencies:
   ```bash
   npm install
   ```

3.	Build the project:
   ```bash
   npm run build
   ```

## Running Tests
   ```bash
   npm test
   ```

## Integration with Claude Desktop
To integrate this MCP server with Claude Desktop, add the following configuration to your
~/Library/Application\ Support/Claude/claude_desktop_config.json file:
  ```json
  {
    "mcpServers": {
      "trello": {
        "command": "{YOUR_NODE_PATH}", // for example: /opt/homebrew/bin/node
        "args": [
          "{YOUR_PATH}/claude-mcp-trello/build/index.js"
        ],
        "env": {
          "TRELLO_API_KEY": "{YOUR_KEY}",
          "TRELLO_TOKEN": "{YOUR_TOKEN}",
          "TRELLO_BOARD_ID": "{YOUR_BOARD_ID}"
        }
      }
    }
  }
  ```

Make sure to replace {YOUR_NODE_PATH}, {YOUR_PATH}, {YOUR_KEY}, {YOUR_TOKEN}, and {YOUR_BOARD_ID} with the appropriate values for your environment.

## Contributing
Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol)
- Uses the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/)