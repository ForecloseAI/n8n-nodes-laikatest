import { LaikaTest } from '../src/nodes/LaikaTest/LaikaTest.node';

describe('Get Prompt Operation', () => {
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

  it('should call httpRequest with correct URL', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([{ content: 'Hello {{name}}' }]),
        type: 'text',
        promptVersionId: 'v123',
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('my-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({});

    await node.execute.call(mockContext);

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://api.laikatest.com/api/v1/prompts/by-name/my-prompt',
      })
    );
  });

  it('should pass versionId when provided', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([{ content: 'Hello' }]),
        type: 'text',
        promptVersionId: 'v123',
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('my-prompt')
      .mockReturnValueOnce('v10')
      .mockReturnValueOnce({});

    await node.execute.call(mockContext);

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.laikatest.com/api/v1/prompts/by-name/my-prompt?versionNumber=v10',
      })
    );
  });

  it('should return { content, type, promptVersionId }', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([{ content: 'Hello {{name}}' }]),
        type: 'text',
        promptVersionId: 'v123',
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('my-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({});

    const result = await node.execute.call(mockContext);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0].json).toEqual({
      content: 'Hello {{name}}',
      type: 'text',
      promptVersionId: 'v123',
    });
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
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([{ content: 'Hello {{name}}' }]),
        type: 'text',
        promptVersionId: 'v123',
      },
    });

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
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([{ content: 'Hello {{name}}' }]),
        type: 'text',
        promptVersionId: 'v123',
      },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('getPrompt')
      .mockReturnValueOnce('my-prompt')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({ variableValues: [] });

    const result = await node.execute.call(mockContext);

    expect(result[0][0].json.content).toBe('Hello {{name}}');
  });

  it('should skip variables with empty keys', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([{ content: 'Hello {{name}}' }]),
        type: 'text',
        promptVersionId: 'v123',
      },
    });

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
