import { LaikaTest } from '../src/nodes/LaikaTest/LaikaTest.node';

describe('Integration Tests', () => {
  let node: LaikaTest;
  let mockContext: any;
  let mockHttpRequest: jest.Mock;

  beforeEach(() => {
    node = new LaikaTest();
    mockHttpRequest = jest.fn();
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
      helpers: { httpRequest: mockHttpRequest },
    };
  });

  it('should complete getPrompt workflow end-to-end', async () => {
    mockContext.getInputData.mockReturnValue([{ json: { input: 'test' } }]);

    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([{ content: 'You are a helpful assistant.' }]),
        type: 'text',
        promptVersionId: 'pv-100',
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('assistant-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({});

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

    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        experimentId: 'exp-200',
        bucketId: 'bucket-A',
        prompt: {
          content: JSON.stringify([
            { role: 'system', content: 'Variant A prompt' },
          ]),
          type: 'chat',
          promptVersionId: 'pv-201',
          promptId: 'prompt-50',
        },
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('Pricing Page Test')
      .mockReturnValueOnce('user-1')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({});

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

    mockHttpRequest.mockResolvedValue({
      success: true,
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

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'https://api.laikatest.com/api/v1/scores',
        body: expect.objectContaining({
          expId: 'exp-200',
          bucketId: 'bucket-A',
          promptVersionId: 'pv-201',
          userId: 'user-1',
          scores: [
            { name: 'conversion', type: 'bool', value: true },
            { name: 'time_on_page', type: 'float', value: 45.5 },
          ],
        }),
      })
    );
  });

  it('should chain getExperimentPrompt -> pushScores', async () => {
    // First call: getExperimentPrompt
    mockContext.getInputData.mockReturnValue([{ json: {} }]);

    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        experimentId: 'exp-300',
        bucketId: 'bucket-B',
        prompt: {
          content: JSON.stringify([{ content: 'Experiment content' }]),
          type: 'text',
          promptVersionId: 'pv-301',
          promptId: 'prompt-60',
        },
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('AB Test')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('session-456')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({});

    const expResult = await node.execute.call(mockContext);
    const expOutput = expResult[0][0].json as any;

    // Verify experiment output has the fields needed for pushScores
    expect(expOutput.experimentId).toBe('exp-300');
    expect(expOutput.bucketId).toBe('bucket-B');
    expect(expOutput.promptVersionId).toBe('pv-301');

    // Reset for second call
    jest.clearAllMocks();

    // Second call: pushScores using output from first call
    mockHttpRequest.mockResolvedValue({
      success: true,
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

    mockHttpRequest
      .mockResolvedValueOnce({
        success: true,
        data: {
          content: JSON.stringify([{ content: 'Content 1' }]),
          type: 'text',
          promptVersionId: 'v1',
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          content: JSON.stringify([{ content: 'Content 2' }]),
          type: 'text',
          promptVersionId: 'v2',
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          content: JSON.stringify([{ content: 'Content 3' }]),
          type: 'text',
          promptVersionId: 'v3',
        },
      });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('prompt-1')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({})
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('prompt-2')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({})
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('prompt-3')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({});

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
