import { LaikaTest } from '../src/nodes/LaikaTest/LaikaTest.node';

// Mock the js-client module
jest.mock('@laikatest/js-client', () => {
  return {
    LaikaTest: jest.fn().mockImplementation(() => ({
      getPrompt: jest.fn(),
      getExperimentPrompt: jest.fn(),
      pushScore: jest.fn().mockResolvedValue({
        success: true,
        statusCode: 200,
        data: { message: 'Scores recorded' },
      }),
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

describe('Push Scores Operation', () => {
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

  it('should require experimentId, bucketId, promptVersionId', () => {
    const expIdProp = node.description.properties.find(
      (p) => p.name === 'experimentId'
    );
    const bucketIdProp = node.description.properties.find(
      (p) => p.name === 'bucketId'
    );
    const pvIdProp = node.description.properties.find(
      (p) => p.name === 'promptVersionId'
    );

    expect(expIdProp?.required).toBe(true);
    expect(bucketIdProp?.required).toBe(true);
    expect(pvIdProp?.required).toBe(true);
  });

  it('should require at least one of userId or sessionId', async () => {
    mockContext.getNodeParameter
      .mockReturnValueOnce('pushScores')
      .mockReturnValueOnce('exp-123')
      .mockReturnValueOnce('bucket-456')
      .mockReturnValueOnce('pv-789')
      .mockReturnValueOnce('') // userId empty
      .mockReturnValueOnce('') // sessionId empty
      .mockReturnValueOnce({
        scoreValues: [{ name: 'rating', type: 'int', value: '5' }],
      });

    await expect(node.execute.call(mockContext)).rejects.toThrow(
      'At least one of User ID or Session ID is required'
    );
  });

  it('should require at least one score', async () => {
    mockContext.getNodeParameter
      .mockReturnValueOnce('pushScores')
      .mockReturnValueOnce('exp-123')
      .mockReturnValueOnce('bucket-456')
      .mockReturnValueOnce('pv-789')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({ scoreValues: [] });

    await expect(node.execute.call(mockContext)).rejects.toThrow(
      'At least one score is required'
    );
  });

  it('should convert "5" with type int to { type: "int", value: 5 }', async () => {
    const { LaikaTest } = require('@laikatest/js-client');

    mockContext.getNodeParameter
      .mockReturnValueOnce('pushScores')
      .mockReturnValueOnce('exp-123')
      .mockReturnValueOnce('bucket-456')
      .mockReturnValueOnce('pv-789')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({
        scoreValues: [{ name: 'rating', type: 'int', value: '5' }],
      });

    await node.execute.call(mockContext);

    const clientInstance = LaikaTest.mock.results[0].value;
    expect(clientInstance.pushScore).toHaveBeenCalledWith(
      'exp-123',
      'bucket-456',
      'pv-789',
      [{ name: 'rating', type: 'int', value: 5 }],
      { userId: 'user-123' }
    );
  });

  it('should convert "0.95" with type float to { type: "float", value: 0.95 }', async () => {
    const { LaikaTest } = require('@laikatest/js-client');

    mockContext.getNodeParameter
      .mockReturnValueOnce('pushScores')
      .mockReturnValueOnce('exp-123')
      .mockReturnValueOnce('bucket-456')
      .mockReturnValueOnce('pv-789')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({
        scoreValues: [{ name: 'accuracy', type: 'float', value: '0.95' }],
      });

    await node.execute.call(mockContext);

    const clientInstance = LaikaTest.mock.results[0].value;
    expect(clientInstance.pushScore).toHaveBeenCalledWith(
      'exp-123',
      'bucket-456',
      'pv-789',
      [{ name: 'accuracy', type: 'float', value: 0.95 }],
      { userId: 'user-123' }
    );
  });

  it('should convert "true" with type bool to { type: "bool", value: true }', async () => {
    const { LaikaTest } = require('@laikatest/js-client');

    mockContext.getNodeParameter
      .mockReturnValueOnce('pushScores')
      .mockReturnValueOnce('exp-123')
      .mockReturnValueOnce('bucket-456')
      .mockReturnValueOnce('pv-789')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({
        scoreValues: [{ name: 'helpful', type: 'bool', value: 'true' }],
      });

    await node.execute.call(mockContext);

    const clientInstance = LaikaTest.mock.results[0].value;
    expect(clientInstance.pushScore).toHaveBeenCalledWith(
      'exp-123',
      'bucket-456',
      'pv-789',
      [{ name: 'helpful', type: 'bool', value: true }],
      { userId: 'user-123' }
    );
  });

  it('should pass string values unchanged', async () => {
    const { LaikaTest } = require('@laikatest/js-client');

    mockContext.getNodeParameter
      .mockReturnValueOnce('pushScores')
      .mockReturnValueOnce('exp-123')
      .mockReturnValueOnce('bucket-456')
      .mockReturnValueOnce('pv-789')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({
        scoreValues: [{ name: 'feedback', type: 'string', value: 'Great!' }],
      });

    await node.execute.call(mockContext);

    const clientInstance = LaikaTest.mock.results[0].value;
    expect(clientInstance.pushScore).toHaveBeenCalledWith(
      'exp-123',
      'bucket-456',
      'pv-789',
      [{ name: 'feedback', type: 'string', value: 'Great!' }],
      { userId: 'user-123' }
    );
  });

  it('should reject invalid int value "abc"', async () => {
    mockContext.getNodeParameter
      .mockReturnValueOnce('pushScores')
      .mockReturnValueOnce('exp-123')
      .mockReturnValueOnce('bucket-456')
      .mockReturnValueOnce('pv-789')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({
        scoreValues: [{ name: 'rating', type: 'int', value: 'abc' }],
      });

    await expect(node.execute.call(mockContext)).rejects.toThrow(
      'Invalid int value'
    );
  });

  it('should reject invalid bool value "maybe"', async () => {
    mockContext.getNodeParameter
      .mockReturnValueOnce('pushScores')
      .mockReturnValueOnce('exp-123')
      .mockReturnValueOnce('bucket-456')
      .mockReturnValueOnce('pv-789')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({
        scoreValues: [{ name: 'helpful', type: 'bool', value: 'maybe' }],
      });

    await expect(node.execute.call(mockContext)).rejects.toThrow(
      'Invalid bool value'
    );
  });

  it('should return { success, statusCode, data }', async () => {
    mockContext.getNodeParameter
      .mockReturnValueOnce('pushScores')
      .mockReturnValueOnce('exp-123')
      .mockReturnValueOnce('bucket-456')
      .mockReturnValueOnce('pv-789')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({
        scoreValues: [{ name: 'rating', type: 'int', value: '5' }],
      });

    const result = await node.execute.call(mockContext);

    expect(result[0][0].json).toEqual({
      success: true,
      statusCode: 200,
      data: { message: 'Scores recorded' },
    });
  });
});
