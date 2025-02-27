#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// --------------------------------------------------
// Imports related to TrelloClient (provided classes and types)
// --------------------------------------------------
import { TrelloClient } from "./trello-client.js";  // ←Change the path according to your own configuration
import {
  TrelloConfig,
  TrelloCard,
  TrelloList,
  TrelloAction,
} from "./types.js"; // ←Change the path according to your own configuration

// --------------------------------------------------
// Define tools for Trello (Tool)
// --------------------------------------------------
interface GetCardsByListArgs {
  listId: string;
}

const trelloGetCardsByListTool: Tool = {
  name: "trello_get_cards_by_list",
  description: "Retrieves a list of cards contained in the specified list ID.",
  inputSchema: {
    type: "object",
    properties: {
      listId: {
        type: "string",
        description: "Trello list ID",
      },
    },
    required: ["listId"],
  },
};

interface GetListsArgs {}

const trelloGetListsTool: Tool = {
  name: "trello_get_lists",
  description: "Retrieves all lists in the board.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

interface GetRecentActivityArgs {
  limit?: number;
}

const trelloGetRecentActivityTool: Tool = {
  name: "trello_get_recent_activity",
  description:
    "Retrieves the most recent board activity. The 'limit' argument can specify how many to retrieve.",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Number of activities to retrieve (default: 10)",
      },
    },
  },
};

interface AddCardArgs {
  listId: string;
  name: string;
  description?: string;
  dueDate?: string;
  labels?: string[];
}

const trelloAddCardTool: Tool = {
  name: "trello_add_card",
  description: "Adds a card to the specified list.",
  inputSchema: {
    type: "object",
    properties: {
      listId: { type: "string", description: "The ID of the list to add to" },
      name: { type: "string", description: "The title of the card" },
      description: {
        type: "string",
        description: "Details of the card (optional)",
      },
      dueDate: {
        type: "string",
        description:
          "Due date (can be specified in ISO8601 format, etc. Optional)",
      },
      labels: {
        type: "array",
        description: "Array of label IDs (optional)",
        items: { type: "string" },
      },
    },
    required: ["listId", "name"],
  },
};

interface UpdateCardArgs {
  cardId: string;
  name?: string;
  description?: string;
  dueDate?: string;
  labels?: string[];
}

const trelloUpdateCardTool: Tool = {
  name: "trello_update_card",
  description: "Updates the content of a card.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: {
        type: "string",
        description: "The ID of the card to be updated",
      },
      name: {
        type: "string",
        description: "The title of the card (optional)",
      },
      description: {
        type: "string",
        description: "Details of the card (optional)",
      },
      dueDate: {
        type: "string",
        description:
          "Due date (can be specified in ISO8601 format, etc. Optional)",
      },
      labels: {
        type: "array",
        description: "An array of label IDs (optional)",
        items: { type: "string" },
      },
    },
    required: ["cardId"],
  },
};

interface ArchiveCardArgs {
  cardId: string;
}

const trelloArchiveCardTool: Tool = {
  name: "trello_archive_card",
  description: "Archives (closes) the specified card.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: {
        type: "string",
        description: "The ID of the card to archive",
      },
    },
    required: ["cardId"],
  },
};

interface AddListArgs {
  name: string;
}

const trelloAddListTool: Tool = {
  name: "trello_add_list",
  description: "Adds a new list to the board.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the list",
      },
    },
    required: ["name"],
  },
};

interface ArchiveListArgs {
  listId: string;
}

const trelloArchiveListTool: Tool = {
  name: "trello_archive_list",
  description: "Archives (closes) the specified list.",
  inputSchema: {
    type: "object",
    properties: {
      listId: {
        type: "string",
        description: "The ID of the list to archive",
      },
    },
    required: ["listId"],
  },
};

interface GetMyCardsArgs {}

const trelloGetMyCardsTool: Tool = {
  name: "trello_get_my_cards",
  description: "Retrieves all cards related to your account.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

interface TrelloSearchAllBoardsArgs {
  query: string;
  limit?: number;
}

const trelloSearchAllBoardsTool: Tool = {
  name: "trello_search_all_boards",
  description:
    "Performs a cross-board search across all boards in the workspace (organization) (depending on plan/permissions).",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search keyword" },
      limit: {
        type: "number",
        description: "Maximum number of results to retrieve (default: 10)",
      },
    },
    required: ["query"],
  },
};

// --------------------------------------------------
// Main server implementation
// --------------------------------------------------
async function main() {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloBoardId = process.env.TRELLO_BOARD_ID;

  if (!trelloApiKey || !trelloToken || !trelloBoardId) {
    console.error("TRELLO_API_KEY / TRELLO_TOKEN / TRELLO_BOARD_ID are not set.");
    process.exit(1);
  }

  console.error("Starting Trello MCP Server...");

  // Initialize MCP Server
  const server = new Server(
    {
      name: "Trello MCP Server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Create Trello client
  const trelloClient = new TrelloClient({
    apiKey: trelloApiKey,
    token: trelloToken,
    boardId: trelloBoardId,
  });

  // --------------------------------------------------
  // Handle CallToolRequest
  // --------------------------------------------------
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    console.error("Received CallToolRequest:", request);
    try {
      if (!request.params.arguments) {
        throw new Error("No arguments provided");
      }

      switch (request.params.name) {
        // --------------------------------------------------
        // Retrieve the list of cards by specifying the listId
        // --------------------------------------------------
        case "trello_get_cards_by_list": {
          const args = request.params.arguments as unknown as GetCardsByListArgs;
          if (!args.listId) {
            throw new Error("Missing required argument: listId");
          }
          const response = await trelloClient.getCardsByList(args.listId);
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        }

        // --------------------------------------------------
        // Retrieve all lists in the board
        // --------------------------------------------------
        case "trello_get_lists": {
          // No arguments
          const response = await trelloClient.getLists();
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        }

        // --------------------------------------------------
        // Recent activity on the board
        // --------------------------------------------------
        case "trello_get_recent_activity": {
          const args = request.params.arguments as unknown as GetRecentActivityArgs;
          const limit = args.limit ?? 10; // Default 10
          const response = await trelloClient.getRecentActivity(limit);
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        }

        // --------------------------------------------------
        // Create a new card
        // --------------------------------------------------
        case "trello_add_card": {
          const args = request.params.arguments as unknown as AddCardArgs;
          if (!args.listId || !args.name) {
            throw new Error("Missing required arguments: listId, name");
          }
          const response = await trelloClient.addCard({
            listId: args.listId,
            name: args.name,
            description: args.description,
            dueDate: args.dueDate,
            labels: args.labels,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        }

        // --------------------------------------------------
        // Update card
        // --------------------------------------------------
        case "trello_update_card": {
          const args = request.params.arguments as unknown as UpdateCardArgs;
          if (!args.cardId) {
            throw new Error("Missing required argument: cardId");
          }
          const response = await trelloClient.updateCard({
            cardId: args.cardId,
            name: args.name,
            description: args.description,
            dueDate: args.dueDate,
            labels: args.labels,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        }

        // --------------------------------------------------
        // Archive card
        // --------------------------------------------------
        case "trello_archive_card": {
          const args = request.params.arguments as unknown as ArchiveCardArgs;
          if (!args.cardId) {
            throw new Error("Missing required argument: cardId");
          }
          const response = await trelloClient.archiveCard(args.cardId);
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        }

        // --------------------------------------------------
        // Create a new list
        // --------------------------------------------------
        case "trello_add_list": {
          const args = request.params.arguments as unknown as AddListArgs;
          if (!args.name) {
            throw new Error("Missing required argument: name");
          }
          const response = await trelloClient.addList(args.name);
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        }

        // --------------------------------------------------
        // Archive list
        // --------------------------------------------------
        case "trello_archive_list": {
          const args = request.params.arguments as unknown as ArchiveListArgs;
          if (!args.listId) {
            throw new Error("Missing required argument: listId");
          }
          const response = await trelloClient.archiveList(args.listId);
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        }

        // --------------------------------------------------
        // Retrieve all cards related to yourself
        // --------------------------------------------------
        case "trello_get_my_cards": {
          const response = await trelloClient.getMyCards();
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        }

        case "trello_search_all_boards": {
          const args = request.params.arguments as unknown as TrelloSearchAllBoardsArgs;
          const limit = args.limit ?? 10;
          const response = await trelloClient.searchAllBoards(args.query, limit);
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      console.error("Error executing tool:", error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
      };
    }
  });

  // --------------------------------------------------
  // Handle ListToolsRequest (return the list of registered tools)
  // --------------------------------------------------
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("Received ListToolsRequest");
    return {
      tools: [
        trelloGetCardsByListTool,
        trelloGetListsTool,
        trelloGetRecentActivityTool,
        trelloAddCardTool,
        trelloUpdateCardTool,
        trelloArchiveCardTool,
        trelloAddListTool,
        trelloArchiveListTool,
        trelloGetMyCardsTool,
        trelloSearchAllBoardsTool,
      ],
    };
  });

  // --------------------------------------------------
  // Start the MCP server
  // --------------------------------------------------
  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);

  console.error("Trello MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});