import { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

// Credentials for LaikaTest API authentication
export class LaikaTestApi implements ICredentialType {
  name = 'laikaTestApi';
  displayName = 'LaikaTest API';
  documentationUrl = 'https://docs.laikatest.com';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Your LaikaTest API key',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.laikatest.com',
      description: 'Base URL for the LaikaTest API',
    },
  ];

  // Test credentials by calling auth verify endpoint
  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/api/v1/auth/verify',
      method: 'GET',
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };
}
