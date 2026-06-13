import { BaseCommunicationService } from './CommunicationService';
import type { CreateEmergencyPayload } from '../../types/emergency';
import type { AppRegisterRequest } from '../../types/auth';

export class ApiCommunicationService extends BaseCommunicationService {
  private apiEndpoint: string;

  constructor(apiEndpoint = 'https://api.resq.app/api/v1') {
    super();
    this.apiEndpoint = apiEndpoint;
  }

  async sendRegistration(data: AppRegisterRequest): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/auth/register/app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async sendEmergency(data: CreateEmergencyPayload): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/requests/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
