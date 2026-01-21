import { LaikaTestApi } from '../src/credentials/LaikaTestApi.credentials';

describe('LaikaTestApi Credentials', () => {
  let credentials: LaikaTestApi;

  beforeEach(() => {
    credentials = new LaikaTestApi();
  });

  it('should have name "laikaTestApi"', () => {
    expect(credentials.name).toBe('laikaTestApi');
  });

  it('should have displayName "LaikaTest API"', () => {
    expect(credentials.displayName).toBe('LaikaTest API');
  });

  it('should require apiKey field with password type', () => {
    const apiKeyProp = credentials.properties.find((p) => p.name === 'apiKey');
    expect(apiKeyProp).toBeDefined();
    expect(apiKeyProp?.type).toBe('string');
    expect(apiKeyProp?.typeOptions?.password).toBe(true);
    expect(apiKeyProp?.required).toBe(true);
  });

  it('should have optional baseUrl with default "https://api.laikatest.com"', () => {
    const baseUrlProp = credentials.properties.find((p) => p.name === 'baseUrl');
    expect(baseUrlProp).toBeDefined();
    expect(baseUrlProp?.type).toBe('string');
    expect(baseUrlProp?.default).toBe('https://api.laikatest.com');
    expect(baseUrlProp?.required).toBeUndefined();
  });
});
