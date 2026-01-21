import { LaikaTest } from '../src/nodes/LaikaTest/LaikaTest.node';

describe('Get Experimental Prompt Operation', () => {
  let node: LaikaTest;
  let mockContext: any;
  let mockHttpRequest: jest.Mock;

  beforeEach(() => {
    node = new LaikaTest();
    mockHttpRequest = jest.fn();
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
      helpers: { httpRequest: mockHttpRequest },
    };
  });

  it('should have experimentTitle field as required', () => {
    const expTitleProp = node.description.properties.find(
      (p) => p.name === 'experimentTitle'
    );
    expect(expTitleProp).toBeDefined();
    expect(expTitleProp?.required).toBe(true);
  });

  it('should call httpRequest with title and context', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        experimentId: 'exp-123',
        bucketId: 'bucket-456',
        prompt: {
          content: JSON.stringify([{ content: 'Welcome {{user}}!' }]),
          type: 'text',
          promptVersionId: 'pv-789',
          promptId: 'prompt-abc',
        },
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('My Experiment')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('session-456')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({});

    await node.execute.call(mockContext);

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'https://api.laikatest.com/api/v3/experiments/evaluate',
        body: {
          experimentTitle: 'My Experiment',
          context: { userId: 'user-123', sessionId: 'session-456' },
        },
      })
    );
  });

  it('should include userId in context when provided', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        experimentId: 'exp-123',
        bucketId: 'bucket-456',
        prompt: {
          content: JSON.stringify([{ content: 'Welcome' }]),
          type: 'text',
          promptVersionId: 'pv-789',
          promptId: 'prompt-abc',
        },
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('My Experiment')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({});

    await node.execute.call(mockContext);

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          experimentTitle: 'My Experiment',
          context: { userId: 'user-123' },
        },
      })
    );
  });

  it('should include sessionId in context when provided', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        experimentId: 'exp-123',
        bucketId: 'bucket-456',
        prompt: {
          content: JSON.stringify([{ content: 'Welcome' }]),
          type: 'text',
          promptVersionId: 'pv-789',
          promptId: 'prompt-abc',
        },
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('My Experiment')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('session-456')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({});

    await node.execute.call(mockContext);

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          experimentTitle: 'My Experiment',
          context: { sessionId: 'session-456' },
        },
      })
    );
  });

  it('should include additionalContext fields', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        experimentId: 'exp-123',
        bucketId: 'bucket-456',
        prompt: {
          content: JSON.stringify([{ content: 'Welcome' }]),
          type: 'text',
          promptVersionId: 'pv-789',
          promptId: 'prompt-abc',
        },
      },
    });

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
      .mockReturnValueOnce({});

    await node.execute.call(mockContext);

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          experimentTitle: 'My Experiment',
          context: { userId: 'user-123', feature: 'pricing', tier: 'premium' },
        },
      })
    );
  });

  it('should return complete experiment metadata', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        experimentId: 'exp-123',
        bucketId: 'bucket-456',
        prompt: {
          content: JSON.stringify([{ content: 'Welcome {{user}}!' }]),
          type: 'text',
          promptVersionId: 'pv-789',
          promptId: 'prompt-abc',
        },
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getExperimentPrompt')
      .mockReturnValueOnce('My Experiment')
      .mockReturnValueOnce('user-123')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({ contextValues: [] })
      .mockReturnValueOnce({});

    const result = await node.execute.call(mockContext);

    expect(result[0][0].json).toEqual({
      content: 'Welcome {{user}}!',
      type: 'text',
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
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        experimentId: 'exp-123',
        bucketId: 'bucket-456',
        prompt: {
          content: JSON.stringify([{ content: 'Welcome {{user}}!' }]),
          type: 'text',
          promptVersionId: 'pv-789',
          promptId: 'prompt-abc',
        },
      },
    });

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
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        experimentId: 'exp-123',
        bucketId: 'bucket-456',
        prompt: {
          content: JSON.stringify([{ content: 'Welcome {{user}}!' }]),
          type: 'text',
          promptVersionId: 'pv-789',
          promptId: 'prompt-abc',
        },
      },
    });

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
