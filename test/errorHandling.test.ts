import { LaikaTest } from '../src/nodes/LaikaTest/LaikaTest.node';

describe('Error Handling', () => {
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

  it('should throw error when API returns success: false', async () => {
    mockHttpRequest.mockResolvedValue({
      success: false,
      error: 'Prompt not found',
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('nonexistent-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({});

    await expect(node.execute.call(mockContext)).rejects.toThrow();
  });

  it('should continue processing items when continueOnFail is true', async () => {
    mockContext.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
    mockContext.continueOnFail.mockReturnValue(true);

    mockHttpRequest
      .mockResolvedValueOnce({ success: false, error: 'First item error' })
      .mockResolvedValueOnce({
        success: true,
        data: {
          content: JSON.stringify([{ content: 'second content' }]),
          type: 'text',
          promptVersionId: 'v2',
        },
      });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('bad-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({})
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('good-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({});

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

    mockHttpRequest.mockResolvedValue({
      success: false,
      error: 'First item error',
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('bad-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({});

    await expect(node.execute.call(mockContext)).rejects.toThrow();

    // Only one call since it stopped on first error
    expect(mockHttpRequest).toHaveBeenCalledTimes(1);
  });

  it('should include Authorization header with Bearer token', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([{ content: 'content' }]),
        type: 'text',
        promptVersionId: 'v123',
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('test-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({});

    await node.execute.call(mockContext);

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
        }),
      })
    );
  });

  it('should use custom baseUrl from credentials', async () => {
    mockContext.getCredentials.mockResolvedValue({
      apiKey: 'test-api-key',
      baseUrl: 'https://custom.example.com',
    });

    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([{ content: 'content' }]),
        type: 'text',
        promptVersionId: 'v123',
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('test-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({});

    await node.execute.call(mockContext);

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('https://custom.example.com'),
      })
    );
  });

  it('should use default baseUrl when not provided', async () => {
    mockContext.getCredentials.mockResolvedValue({
      apiKey: 'test-api-key',
    });

    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([{ content: 'content' }]),
        type: 'text',
        promptVersionId: 'v123',
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('test-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({});

    await node.execute.call(mockContext);

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('https://api.laikatest.com'),
      })
    );
  });
});
