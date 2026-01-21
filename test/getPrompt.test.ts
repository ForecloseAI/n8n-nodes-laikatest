import { LaikaTest } from '../src/nodes/LaikaTest/LaikaTest.node';

// Mock the js-client module
jest.mock('@laikatest/js-client', () => {
  // Create compiled prompt mock
  const createCompiledPrompt = (content: string) => ({
    getContent: jest.fn().mockReturnValue(content),
    getType: jest.fn().mockReturnValue('text'),
    getPromptVersionId: jest.fn().mockReturnValue('v123'),
    compile: jest.fn(),
  });

  const mockPrompt = {
    getContent: jest.fn().mockReturnValue('Hello {{name}}'),
    getType: jest.fn().mockReturnValue('text'),
    getPromptVersionId: jest.fn().mockReturnValue('v123'),
    compile: jest.fn().mockImplementation((vars: Record<string, string>) => {
      let content = 'Hello {{name}}';
      for (const [key, value] of Object.entries(vars)) {
        content = content.replace(`{{${key}}}`, value);
      }
      return createCompiledPrompt(content);
    }),
  };

  return {
    LaikaTest: jest.fn().mockImplementation(() => ({
      getPrompt: jest.fn().mockResolvedValue(mockPrompt),
      getExperimentPrompt: jest.fn(),
      pushScore: jest.fn(),
      destroy: jest.fn(),
    })),
    ValidationError: class ValidationError extends Error {
      name = 'ValidationError';
    },
    AuthenticationError: class AuthenticationError extends Error {
      name = 'AuthenticationError';
    },
    NetworkError: class NetworkError extends Error {
      name = 'NetworkError';
    },
    LaikaServiceError: class LaikaServiceError extends Error {
      name = 'LaikaServiceError';
      statusCode = 500;
    },
  };
});

describe('Get Prompt Operation', () => {
  let node: LaikaTest;
  let mockContext: any;

  beforeEach(() => {
    node = new LaikaTest();
    jest.clearAllMocks();

    mockContext = {
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getCredentials: jest.fn().mockResolvedValue({
        apiKey: 'test-api-key',
        baseUrl: 'https://api.laikatest.com',
      }),
      getNodeParameter: jest.fn(),
      getNode: jest.fn().mockReturnValue({ name: 'LaikaTest' }),
      continueOnFail: jest.fn().mockReturnValue(false),
    };
  });

  it('should have promptName field as required', () => {
    const promptNameProp = node.description.properties.find(
      (p) => p.name === 'promptName'
    );
    expect(promptNameProp).toBeDefined();
    expect(promptNameProp?.required).toBe(true);
    expect(promptNameProp?.type).toBe('string');
  });

  it('should have versionId field as optional', () => {
    const versionIdProp = node.description.properties.find(
      (p) => p.name === 'versionId'
    );
    expect(versionIdProp).toBeDefined();
    expect(versionIdProp?.required).toBeUndefined();
    expect(versionIdProp?.default).toBe('');
  });

  it('should only show getPrompt fields for getPrompt operation', () => {
    const promptNameProp = node.description.properties.find(
      (p) => p.name === 'promptName'
    );
    expect(promptNameProp?.displayOptions?.show?.operation).toContain(
      'getPrompt'
    );
  });

  it('should call client.getPrompt with promptName', async () => {
    const { LaikaTest } = require('@laikatest/js-client');

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt') // operation
      .mockReturnValueOnce('my-prompt') // promptName
      .mockReturnValueOnce('') // versionId
      .mockReturnValueOnce({}); // variables

    const result = await node.execute.call(mockContext);

    const clientInstance = LaikaTest.mock.results[0].value;
    expect(clientInstance.getPrompt).toHaveBeenCalledWith('my-prompt', {
      bypassCache: true,
    });
  });

  it('should pass versionId when provided', async () => {
    const { LaikaTest } = require('@laikatest/js-client');

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('my-prompt')
      .mockReturnValueOnce('v10')
      .mockReturnValueOnce({}); // variables

    await node.execute.call(mockContext);

    const clientInstance = LaikaTest.mock.results[0].value;
    expect(clientInstance.getPrompt).toHaveBeenCalledWith('my-prompt', {
      bypassCache: true,
      versionId: 'v10',
    });
  });

  it('should return { content, type, promptVersionId }', async () => {
    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('my-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}); // variables

    const result = await node.execute.call(mockContext);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0].json).toEqual({
      content: 'Hello {{name}}',
      type: 'text',
      promptVersionId: 'v123',
    });
  });

  it('should destroy client after execution', async () => {
    const { LaikaTest } = require('@laikatest/js-client');

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('my-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}); // variables

    await node.execute.call(mockContext);

    const clientInstance = LaikaTest.mock.results[0].value;
    expect(clientInstance.destroy).toHaveBeenCalled();
  });

  it('should have variables field for getPrompt operation', () => {
    const variablesProp = node.description.properties.find(
      (p) => p.name === 'variables'
    );
    expect(variablesProp).toBeDefined();
    expect(variablesProp?.type).toBe('fixedCollection');
    expect(variablesProp?.displayOptions?.show?.operation).toContain(
      'getPrompt'
    );
  });

  it('should compile prompt when variables provided', async () => {
    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('my-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({
        variableValues: [{ key: 'name', value: 'World' }],
      });

    const result = await node.execute.call(mockContext);

    expect(result[0][0].json).toEqual({
      content: 'Hello World',
      type: 'text',
      promptVersionId: 'v123',
    });
  });

  it('should not compile when variables empty', async () => {
    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('my-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({ variableValues: [] });

    const result = await node.execute.call(mockContext);

    expect(result[0][0].json.content).toBe('Hello {{name}}');
  });

  it('should skip variables with empty keys', async () => {
    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('my-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({
        variableValues: [
          { key: '', value: 'ignored' },
          { key: 'name', value: 'Test' },
        ],
      });

    const result = await node.execute.call(mockContext);

    expect(result[0][0].json.content).toBe('Hello Test');
  });
});
