import { LaikaTest } from '../src/nodes/LaikaTest/LaikaTest.node';

// Mock the js-client module
jest.mock('@laikatest/js-client', () => {
  // Create compiled prompt mock
  const createCompiledPrompt = (content: string) => ({
    getContent: jest.fn().mockReturnValue(content),
    getType: jest.fn().mockReturnValue('chat'),
    getExperimentId: jest.fn().mockReturnValue('exp-123'),
    getBucketId: jest.fn().mockReturnValue('bucket-456'),
    getPromptVersionId: jest.fn().mockReturnValue('pv-789'),
    getPromptId: jest.fn().mockReturnValue('prompt-abc'),
    compile: jest.fn(),
  });

  const mockPrompt = {
    getContent: jest.fn().mockReturnValue('Welcome {{user}}!'),
    getType: jest.fn().mockReturnValue('chat'),
    getExperimentId: jest.fn().mockReturnValue('exp-123'),
    getBucketId: jest.fn().mockReturnValue('bucket-456'),
    getPromptVersionId: jest.fn().mockReturnValue('pv-789'),
    getPromptId: jest.fn().mockReturnValue('prompt-abc'),
    compile: jest.fn().mockImplementation((vars: Record<string, string>) => {
      let content = 'Welcome {{user}}!';
      for (const [key, value] of Object.entries(vars)) {
        content = content.replace(`{{${key}}}`, value);
      }
      return createCompiledPrompt(content);
    }),
  };

  return {
    LaikaTest: jest.fn().mockImplementation(() => ({
      getPrompt: jest.fn(),
      getExperimentPrompt: jest.fn().mockResolvedValue(mockPrompt),
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

describe('Get Experimental Prompt Operation', () => {
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

  it('should have experimentTitle field as required', () => {
    const expTitleProp = node.description.properties.find(
      (p) => p.name === 'experimentTitle'
    );
    expect(expTitleProp).toBeDefined();
    expect(expTitleProp?.required).toBe(true);
  });

  it('should call client.getExperimentPrompt with title and context', async () => {
    const { LaikaTest } = require('@laikatest/js-client');

    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('My Experiment')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('session-456')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({}); // experimentVariables

    await node.execute.call(mockContext);

    const clientInstance = LaikaTest.mock.results[0].value;
    expect(clientInstance.getExperimentPrompt).toHaveBeenCalledWith(
      'My Experiment',
      { userId: 'user-123', sessionId: 'session-456' }
    );
  });

  it('should include userId in context when provided', async () => {
    const { LaikaTest } = require('@laikatest/js-client');

    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('My Experiment')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({}); // experimentVariables

    await node.execute.call(mockContext);

    const clientInstance = LaikaTest.mock.results[0].value;
    expect(clientInstance.getExperimentPrompt).toHaveBeenCalledWith(
      'My Experiment',
      { userId: 'user-123' }
    );
  });

  it('should include sessionId in context when provided', async () => {
    const { LaikaTest } = require('@laikatest/js-client');

    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('My Experiment')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('session-456')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({}); // experimentVariables

    await node.execute.call(mockContext);

    const clientInstance = LaikaTest.mock.results[0].value;
    expect(clientInstance.getExperimentPrompt).toHaveBeenCalledWith(
      'My Experiment',
      { sessionId: 'session-456' }
    );
  });

  it('should include additionalContext fields', async () => {
    const { LaikaTest } = require('@laikatest/js-client');

    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('My Experiment')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({
        contextValues: [
          { key: 'feature', value: 'pricing' },
          { key: 'tier', value: 'premium' },
        ],
      })
      .mockReturnValueOnce({}); // experimentVariables

    await node.execute.call(mockContext);

    const clientInstance = LaikaTest.mock.results[0].value;
    expect(clientInstance.getExperimentPrompt).toHaveBeenCalledWith(
      'My Experiment',
      { userId: 'user-123', feature: 'pricing', tier: 'premium' }
    );
  });

  it('should return complete experiment metadata', async () => {
    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('My Experiment')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({}); // experimentVariables

    const result = await node.execute.call(mockContext);

    expect(result[0][0].json).toEqual({
      content: 'Welcome {{user}}!',
      type: 'chat',
      experimentId: 'exp-123',
      bucketId: 'bucket-456',
      promptVersionId: 'pv-789',
      promptId: 'prompt-abc',
    });
  });

  it('should have experimentVariables field', () => {
    const varsProp = node.description.properties.find(
      (p) => p.name === 'experimentVariables'
    );
    expect(varsProp).toBeDefined();
    expect(varsProp?.type).toBe('fixedCollection');
    expect(varsProp?.displayOptions?.show?.operation).toContain(
      'getExperimentPrompt'
    );
  });

  it('should compile experiment prompt when variables provided', async () => {
    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('My Experiment')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({
        variableValues: [{ key: 'user', value: 'Alice' }],
      });

    const result = await node.execute.call(mockContext);

    expect(result[0][0].json.content).toBe('Welcome Alice!');
  });

  it('should not compile when experiment variables empty', async () => {
    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('My Experiment')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({ variableValues: [] });

    const result = await node.execute.call(mockContext);

    expect(result[0][0].json.content).toBe('Welcome {{user}}!');
  });
});
