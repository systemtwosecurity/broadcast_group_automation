import axios, { AxiosInstance } from 'axios';
import type { SourceResponse } from '../types/index.js';

export class IntegrationsAPI {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async createSource(token: string, sourceData: any): Promise<SourceResponse> {
    try {
      const response = await this.client.post(
        '/api/v1/sources/generic',
        sourceData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to create source: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
      }
      throw error;
    }
  }
}

