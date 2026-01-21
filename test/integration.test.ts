import { LaikaTest } from '../src/nodes/LaikaTest/LaikaTest.node';

// Create mock client instance
const mockClientInstance = {
  getPrompt: jest.fn(),
  getExperimentPrompt: jest.fn(),
  pushScore: jest.fn(),
  destroy: jest.fn(),
};

// Mock the js-client module for integration tests
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

describe('Integration Tests', () => {
  let node: LaikaTest;
  let mockContext: any;

  beforeEach(() => {
    node = new LaikaTest();
    jest.clearAllMocks();

    mockContext = {
      getInputData: jest.fn(),
      getCredentials: jest.fn().mockResolvedValue({
        apiKey: 'test-api-key',
        baseUrl: 'https://api.laikatest.com',
      }),
      getNodeParameter: jest.fn(),
      getNode: jest.fn().mockReturnValue({ name: 'LaikaTest' }),
      continueOnFail: jest.fn().mockReturnValue(false),
    };
  });

  it('should complete getPrompt workflow end-to-end', async () => {
    mockContext.getInputData.mockReturnValue([{ json: { input: 'test' } }]);

    mockClientInstance.getPrompt.mockResolvedValue({
      getContent: () => 'You are a helpful assistant.',
      getType: () => 'text',
      getPromptVersionId: () => 'pv-100',
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('assistant-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}); // variables

    const result = await node.execute.call(mockContext);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0].json).toEqual({
      content: 'You are a helpful assistant.',
      type: 'text',
      promptVersionId: 'pv-100',
    });
  });

  it('should complete getExperimentPrompt workflow end-to-end', async () => {
    mockContext.getInputData.mockReturnValue([{ json: { userId: 'user-1' } }]);

    mockClientInstance.getExperimentPrompt.mockResolvedValue({
      getContent: () => [{ role: 'system', content: 'Variant A prompt' }],
      getType: () => 'chat',
      getExperimentId: () => 'exp-200',
      getBucketId: () => 'bucket-A',
      getPromptVersionId: () => 'pv-201',
      getPromptId: () => 'prompt-50',
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('Pricing Page Test')
      .mockReturnValueOnce('user-1')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({}); // experimentVariables

    const result = await node.execute.call(mockContext);

    expect(result[0][0].json).toEqual({
      content: [{ role: 'system', content: 'Variant A prompt' }],
      type: 'chat',
      experimentId: 'exp-200',
      bucketId: 'bucket-A',
      promptVersionId: 'pv-201',
      promptId: 'prompt-50',
    });
  });

  it('should complete pushScores workflow end-to-end', async () => {
    mockContext.getInputData.mockReturnValue([{ json: {} }]);

    mockClientInstance.pushScore.mockResolvedValue({
      success: true,
      statusCode: 200,
      data: { recorded: 2 },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('pushScores')
      .mockReturnValueOnce('exp-200')
      .mockReturnValueOnce('bucket-A')
      .mockReturnValueOnce('pv-201')
      .mockReturnValueOnce('user-1')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({
        scoreValues: [
          { name: 'conversion', type: 'bool', value: 'true' },
          { name: 'time_on_page', type: 'float', value: '45.5' },
        ],
      });

    const result = await node.execute.call(mockContext);

    expect(result[0][0].json).toEqual({
      success: true,
      statusCode: 200,
      data: { recorded: 2 },
    });

    expect(mockClientInstance.pushScore).toHaveBeenCalledWith(
      'exp-200',
      'bucket-A',
      'pv-201',
      [
        { name: 'conversion', type: 'bool', value: true },
        { name: 'time_on_page', type: 'float', value: 45.5 },
      ],
      { userId: 'user-1' }
    );
  });

  it('should chain getExperimentPrompt -> pushScores', async () => {
    // First call: getExperimentPrompt
    mockContext.getInputData.mockReturnValue([{ json: {} }]);

    mockClientInstance.getExperimentPrompt.mockResolvedValue({
      getContent: () => 'Experiment content',
      getType: () => 'text',
      getExperimentId: () => 'exp-300',
      getBucketId: () => 'bucket-B',
      getPromptVersionId: () => 'pv-301',
      getPromptId: () => 'prompt-60',
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('AB Test')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('session-456')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({}); // experimentVariables

    const expResult = await node.execute.call(mockContext);
    const expOutput = expResult[0][0].json as any;

    // Verify experiment output has the fields needed for pushScores
    expect(expOutput.experimentId).toBe('exp-300');
    expect(expOutput.bucketId).toBe('bucket-B');
    expect(expOutput.promptVersionId).toBe('pv-301');

    // Reset for second call
    jest.clearAllMocks();

    // Second call: pushScores using output from first call
    mockClientInstance.pushScore.mockResolvedValue({
      success: true,
      statusCode: 200,
      data: {},
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('pushScores')
      .mockReturnValueOnce(expOutput.experimentId)
      .mockReturnValueOnce(expOutput.bucketId)
      .mockReturnValueOnce(expOutput.promptVersionId)
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('session-456')
      .mockReturnValueOnce({
        scoreValues: [{ name: 'success', type: 'bool', value: 'true' }],
      });

    const scoreResult = await node.execute.call(mockContext);

    expect(scoreResult[0][0].json).toEqual({
      success: true,
      statusCode: 200,
      data: {},
    });
  });

  it('should process multiple input items', async () => {
    mockContext.getInputData.mockReturnValue([
      { json: { promptName: 'prompt-1' } },
      { json: { promptName: 'prompt-2' } },
      { json: { promptName: 'prompt-3' } },
    ]);

    mockClientInstance.getPrompt
      .mockResolvedValueOnce({
        getContent: () => 'Content 1',
        getType: () => 'text',
        getPromptVersionId: () => 'v1',
      })
      .mockResolvedValueOnce({
        getContent: () => 'Content 2',
        getType: () => 'text',
        getPromptVersionId: () => 'v2',
      })
      .mockResolvedValueOnce({
        getContent: () => 'Content 3',
        getType: () => 'text',
        getPromptVersionId: () => 'v3',
      });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('prompt-1')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}) // variables
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('prompt-2')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}) // variables
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('prompt-3')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({}); // variables

    const result = await node.execute.call(mockContext);

    expect(result[0]).toHaveLength(3);
    expect(result[0][0].json).toEqual({
      content: 'Content 1',
      type: 'text',
      promptVersionId: 'v1',
    });
    expect(result[0][1].json).toEqual({
      content: 'Content 2',
      type: 'text',
      promptVersionId: 'v2',
    });
    expect(result[0][2].json).toEqual({
      content: 'Content 3',
      type: 'text',
      promptVersionId: 'v3',
    });
  });
});
