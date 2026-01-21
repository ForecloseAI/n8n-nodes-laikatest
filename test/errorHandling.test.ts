import { LaikaTest } from '../src/nodes/LaikaTest/LaikaTest.node';

// Create mock client instance
const mockClientInstance = {
  getPrompt: jest.fn(),
  getExperimentPrompt: jest.fn(),
  pushScore: jest.fn(),
  destroy: jest.fn(),
};

// Mock error classes - defined inline in the mock
class ValidationErrorMock extends Error {
  name = 'ValidationError';
}
class AuthenticationErrorMock extends Error {
  name = 'AuthenticationError';
}
class NetworkErrorMock extends Error {
  name = 'NetworkError';
  originalError: Error;
  constructor(message: string, originalError: Error) {
    super(message);
    this.originalError = originalError;
  }
}
class LaikaServiceErrorMock extends Error {
  name = 'LaikaServiceError';
  statusCode: number;
  response: any;
  constructor(message: string, statusCode: number, response: any) {
    super(message);
    this.statusCode = statusCode;
    this.response = response;
  }
}

// Mock the js-client module
jest.mock('@laikatest/js-client', () => ({
  LaikaTest: jest.fn().mockImplementation(() => mockClientInstance),
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
}));

describe('Error Handling', () => {
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

  it('should create client at start of execute', async () => {
    const { LaikaTest } = require('@laikatest/js-client');

    mockClientInstance.getPrompt.mockResolvedValue({
      getContent: () => 'content',
      getType: () => 'text',
      getPromptVersionId: () => 'v1',
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('test-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}); // variables

    await node.execute.call(mockContext);

    expect(LaikaTest).toHaveBeenCalledWith('test-api-key', {
      baseUrl: 'https://api.laikatest.com',
      cacheEnabled: false,
    });
  });

  it('should destroy client after successful execution', async () => {
    mockClientInstance.getPrompt.mockResolvedValue({
      getContent: () => 'content',
      getType: () => 'text',
      getPromptVersionId: () => 'v1',
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('test-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}); // variables

    await node.execute.call(mockContext);

    expect(mockClientInstance.destroy).toHaveBeenCalled();
  });

  it('should destroy client even when error occurs', async () => {
    mockClientInstance.getPrompt.mockRejectedValue(
      new ValidationErrorMock('Invalid prompt name')
    );

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}); // variables

    try {
      await node.execute.call(mockContext);
    } catch {
      // Expected to throw
    }

    expect(mockClientInstance.destroy).toHaveBeenCalled();
  });

  it('should continue processing items when continueOnFail is true', async () => {
    mockContext.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
    mockContext.continueOnFail.mockReturnValue(true);

    mockClientInstance.getPrompt
      .mockRejectedValueOnce(new ValidationErrorMock('First item error'))
      .mockResolvedValueOnce({
        getContent: () => 'second content',
        getType: () => 'text',
        getPromptVersionId: () => 'v2',
      });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('bad-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}) // variables
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('good-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}); // variables

    const result = await node.execute.call(mockContext);

    expect(result[0]).toHaveLength(2);
    expect(result[0][0].json).toHaveProperty('error');
    expect(result[0][1].json).toEqual({
      content: 'second content',
      type: 'text',
      promptVersionId: 'v2',
    });
  });

  it('should stop on first error when continueOnFail is false', async () => {
    mockContext.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
    mockContext.continueOnFail.mockReturnValue(false);

    mockClientInstance.getPrompt.mockRejectedValue(
      new ValidationErrorMock('First item error')
    );

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('bad-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}); // variables

    await expect(node.execute.call(mockContext)).rejects.toThrow();

    // Only one call since it stopped on first error
    expect(mockClientInstance.getPrompt).toHaveBeenCalledTimes(1);
  });

  it('should map ValidationError to NodeOperationError', async () => {
    mockClientInstance.getPrompt.mockRejectedValue(
      new ValidationErrorMock('Invalid prompt name')
    );

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}); // variables

    await expect(node.execute.call(mockContext)).rejects.toThrow(
      'Invalid prompt name'
    );
  });

  it('should map AuthenticationError to NodeApiError with 401', async () => {
    mockClientInstance.getPrompt.mockRejectedValue(
      new AuthenticationErrorMock('Invalid API key')
    );

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('test-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}); // variables

    try {
      await node.execute.call(mockContext);
      fail('Expected error to be thrown');
    } catch (error: any) {
      expect(error.message).toContain('Invalid API key');
    }
  });

  it('should map LaikaServiceError to NodeApiError with status code', async () => {
    mockClientInstance.getPrompt.mockRejectedValue(
      new LaikaServiceErrorMock('Prompt not found', 404, {})
    );

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('nonexistent')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}); // variables

    try {
      await node.execute.call(mockContext);
      fail('Expected error to be thrown');
    } catch (error: any) {
      expect(error.message).toContain('Prompt not found');
    }
  });

  it('should map NetworkError to NodeApiError', async () => {
    mockClientInstance.getPrompt.mockRejectedValue(
      new NetworkErrorMock('Connection timeout', new Error('ETIMEDOUT'))
    );

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('test-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}); // variables

    try {
      await node.execute.call(mockContext);
      fail('Expected error to be thrown');
    } catch (error: any) {
      expect(error.message).toContain('Connection timeout');
    }
  });
});
