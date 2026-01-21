import { LaikaTest } from '../src/nodes/LaikaTest/LaikaTest.node';

describe('Push Scores Operation', () => {
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
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
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
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: { message: 'Scores recorded' },
    });

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

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          scores: [{ name: 'rating', type: 'int', value: 5 }],
        }),
      })
    );
  });

  it('should convert "0.95" with type float to { type: "float", value: 0.95 }', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: { message: 'Scores recorded' },
    });

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

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          scores: [{ name: 'accuracy', type: 'float', value: 0.95 }],
        }),
      })
    );
  });

  it('should convert "true" with type bool to { type: "bool", value: true }', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: { message: 'Scores recorded' },
    });

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

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          scores: [{ name: 'helpful', type: 'bool', value: true }],
        }),
      })
    );
  });

  it('should pass string values unchanged', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: { message: 'Scores recorded' },
    });

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

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          scores: [{ name: 'feedback', type: 'string', value: 'Great!' }],
        }),
      })
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
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: { message: 'Scores recorded' },
    });

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

  it('should include userId in request when provided', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: { message: 'Scores recorded' },
    });

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

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          userId: 'user-123',
          expId: 'exp-123',
          bucketId: 'bucket-456',
          promptVersionId: 'pv-789',
        }),
      })
    );
  });

  it('should include sessionId in request when provided', async () => {
    mockHttpRequest.mockResolvedValue({
      success: true,
      data: { message: 'Scores recorded' },
    });

    mockContext.getNodeParameter
      .mockReturnValueOnce('pushScores')
      .mockReturnValueOnce('exp-123')
      .mockReturnValueOnce('bucket-456')
      .mockReturnValueOnce('pv-789')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('session-456')
      .mockReturnValueOnce({
        scoreValues: [{ name: 'rating', type: 'int', value: '5' }],
      });

    await node.execute.call(mockContext);

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          sessionId: 'session-456',
        }),
      })
    );
  });
});
