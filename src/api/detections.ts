import axios, { AxiosInstance } from 'axios';
import type { InvitationResponse, GroupResponse } from '../types/index.js';

export class DetectionsAPI {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async sendInvitations(token: string, emails: string[]): Promise<InvitationResponse> {
    try {
      const response = await this.client.post(
        '/api/v1/users/invitations',
        { emails },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to send invitations: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
      }
      throw error;
    }
  }

  async createGroup(token: string, groupData: any): Promise<GroupResponse> {
    try {
      const response = await this.client.post(
        '/api/v1/groups',
        groupData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to create group: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
      }
      throw error;
    }
  }
}

