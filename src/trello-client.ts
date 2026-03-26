import axios, { AxiosInstance } from 'axios';
import { TrelloConfig, TrelloCard, TrelloList, TrelloAction, TrelloMember, TrelloAttachment } from './types.js';
import { createTrelloRateLimiters } from './rate-limiter.js';

export class TrelloClient {
  private axiosInstance: AxiosInstance;
  private rateLimiter;

  constructor(private config: TrelloConfig) {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.trello.com/1',
      params: {
        key: config.apiKey,
        token: config.token,
      },
    });

    this.rateLimiter = createTrelloRateLimiters();

    // Add rate limiting interceptor
    this.axiosInstance.interceptors.request.use(async (config) => {
      await this.rateLimiter.waitForAvailable();
      return config;
    });
  }

  private async handleRequest<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          // Rate limit exceeded, wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.handleRequest(request);
        }
        throw new Error(`Trello API error: ${error.response?.data?.message ?? error.message}`);
      }
      throw error;
    }
  }

  async getCardsByList(listId: string): Promise<TrelloCard[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/lists/${listId}/cards`);
      return response.data;
    });
  }

  /**
   * Retrieves all lists for a specific board.
   *
   * @param boardId - The ID of the board to get lists from
   * @returns Promise resolving to an array of TrelloList objects
   */
  async getLists(boardId: string): Promise<TrelloList[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${boardId}/lists`);
      return response.data;
    });
  }

  /**
   * Retrieves recent activity for a specific board.
   *
   * @param boardId - The ID of the board to get activity from
   * @param limit - Maximum number of activities to retrieve (default: 10)
   * @returns Promise resolving to an array of TrelloAction objects
   */
  async getRecentActivity(boardId: string, limit: number = 10): Promise<TrelloAction[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${boardId}/actions`, {
        params: { limit },
      });
      return response.data;
    });
  }

  async addCard(params: {
    listId: string;
    name: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
  }): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post('/cards', {
        idList: params.listId,
        name: params.name,
        desc: params.description,
        due: params.dueDate,
        idLabels: params.labels,
      });
      return response.data;
    });
  }

  async updateCard(params: {
    cardId: string;
    name?: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    listId?: string;
  }): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${params.cardId}`, {
        name: params.name,
        desc: params.description,
        due: params.dueDate,
        idLabels: params.labels,
        idList: params.listId,
      });
      return response.data;
    });
  }

  async archiveCard(cardId: string): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${cardId}`, {
        closed: true,
      });
      return response.data;
    });
  }

  /**
   * Adds a new list to a specific board.
   *
   * @param boardId - The ID of the board to add the list to
   * @param name - The name of the new list
   * @returns Promise resolving to the created TrelloList object
   */
  async addList(boardId: string, name: string): Promise<TrelloList> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post('/lists', {
        name,
        idBoard: boardId,
      });
      return response.data;
    });
  }

  async archiveList(listId: string): Promise<TrelloList> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/lists/${listId}/closed`, {
        value: true,
      });
      return response.data;
    });
  }

  async getMyCards(): Promise<TrelloCard[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get('/members/me/cards');
      return response.data;
    });
  }

  async searchAllBoards(query: string, limit: number = 10): Promise<any> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get('/search', {
        params: {
          query,
          modelTypes: 'all',
          boards_limit: limit,
          cards_limit: limit,
          organization: true,
        },
      });
      return response.data;
    });
  }

  /**
   * Retrieves all attachments for a specific card.
   *
   * @param cardId - The ID of the card to get attachments from
   * @returns Promise resolving to an array of TrelloAttachment objects
   *
   * @example
   * const attachments = await client.getCardAttachments('abc123');
   * console.log(attachments.map(a => a.name));
   */
  async getCardAttachments(cardId: string): Promise<TrelloAttachment[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/cards/${cardId}/attachments`);
      return response.data;
    });
  }

  /**
   * Downloads an attachment from a Trello card and returns its content as base64.
   *
   * Note: This method is suitable for small to medium-sized files. For very large files,
   * consider using the attachment URL directly with appropriate streaming.
   *
   * @param cardId - The ID of the card containing the attachment
   * @param attachmentId - The ID of the attachment to download
   * @returns Promise resolving to an object containing:
   *   - attachment: The attachment metadata
   *   - content: Base64-encoded file content (for Trello uploads)
   *   - url: Direct URL to the attachment (for external links or as fallback)
   *
   * @example
   * const result = await client.downloadAttachment('cardId', 'attachmentId');
   * if (result.content) {
   *   // Decode base64 content
   *   const buffer = Buffer.from(result.content, 'base64');
   * }
   */
  async downloadAttachment(cardId: string, attachmentId: string): Promise<{
    attachment: TrelloAttachment;
    content: string | null;
    url: string;
    error?: string;
  }> {
    return this.handleRequest(async () => {
      // First, get the attachment metadata
      const metadataResponse = await this.axiosInstance.get(
        `/cards/${cardId}/attachments/${attachmentId}`
      );
      const attachment: TrelloAttachment = metadataResponse.data;

      // If it's not a Trello upload (external link), just return the URL
      if (!attachment.isUpload) {
        return {
          attachment,
          content: null,
          url: attachment.url,
        };
      }

      // For Trello uploads, download the actual content
      // The download endpoint requires OAuth header authentication (not query params)
      try {
        const contentResponse = await axios.get(attachment.url, {
          responseType: 'arraybuffer',
          // Follow redirects (Trello often redirects to S3 signed URLs)
          maxRedirects: 5,
          // Increase timeout for larger files
          timeout: 60000,
          headers: {
            'Accept': '*/*',
            'Authorization': `OAuth oauth_consumer_key="${this.config.apiKey}", oauth_token="${this.config.token}"`,
          },
        });

        // Convert to base64 for safe transmission
        const base64Content = Buffer.from(contentResponse.data).toString('base64');

        return {
          attachment,
          content: base64Content,
          url: attachment.url,
        };
      } catch (error) {
        // Extract meaningful error message
        let errorMessage = 'Unknown error';
        if (axios.isAxiosError(error)) {
          if (error.response) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
          } else if (error.code) {
            errorMessage = `Network error: ${error.code} - ${error.message}`;
          } else {
            errorMessage = error.message;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        console.error('Failed to download attachment content:', errorMessage);

        return {
          attachment,
          content: null,
          url: attachment.url,
          error: `Download failed: ${errorMessage}`,
        };
      }
    });
  }
}
