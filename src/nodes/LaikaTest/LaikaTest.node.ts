import {
  IExecuteFunctions,
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeApiError,
  NodeOperationError,
} from 'n8n-workflow';
import {
  LaikaTest as LaikaTestClient,
  ValidationError,
  AuthenticationError,
  NetworkError,
  LaikaServiceError,
  ScoreInput,
} from '@laikatest/js-client';

// Convert n8n string inputs to typed score objects
function convertScore(raw: {
  name: string;
  type: string;
  value: string;
}): ScoreInput {
  const { name, type, value } = raw;

  switch (type) {
    case 'int': {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        throw new Error(`Invalid int value "${value}" for score "${name}"`);
      }
      return { name, type: 'int', value: parsed };
    }
    case 'float': {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) {
        throw new Error(`Invalid float value "${value}" for score "${name}"`);
      }
      return { name, type: 'float', value: parsed };
    }
    case 'bool': {
      const lower = value.toLowerCase();
      if (lower !== 'true' && lower !== 'false') {
        throw new Error(`Invalid bool value "${value}" for score "${name}"`);
      }
      return { name, type: 'bool', value: lower === 'true' };
    }
    case 'string':
      return { name, type: 'string', value };
    default:
      throw new Error(`Unknown score type "${type}" for score "${name}"`);
  }
}

// Map client errors to n8n errors
function mapErrorToN8n(
  error: unknown,
  ctx: IExecuteFunctions,
  itemIndex: number
): NodeApiError | NodeOperationError {
  if (error instanceof ValidationError) {
    return new NodeOperationError(ctx.getNode(), error.message, { itemIndex });
  }
  if (error instanceof AuthenticationError) {
    return new NodeApiError(ctx.getNode(), { message: error.message }, {
      httpCode: '401',
      itemIndex,
    });
  }
  if (error instanceof NetworkError) {
    return new NodeApiError(ctx.getNode(), { message: error.message }, {
      itemIndex,
    });
  }
  if (error instanceof LaikaServiceError) {
    return new NodeApiError(ctx.getNode(), { message: error.message }, {
      httpCode: String(error.statusCode),
      itemIndex,
    });
  }
  if (error instanceof Error) {
    return new NodeOperationError(ctx.getNode(), error.message, { itemIndex });
  }
  return new NodeOperationError(ctx.getNode(), 'Unknown error', { itemIndex });
}

// Handle Get Prompt operation
async function handleGetPrompt(
  ctx: IExecuteFunctions,
  client: LaikaTestClient,
  itemIndex: number
): Promise<IDataObject> {
  const promptName = ctx.getNodeParameter('promptName', itemIndex) as string;
  const versionId = ctx.getNodeParameter('versionId', itemIndex) as string;
  const variables = ctx.getNodeParameter('variables', itemIndex) as {
    variableValues?: Array<{ key: string; value: string }>;
  };

  const options: { versionId?: string; bypassCache: boolean } = {
    bypassCache: true,
  };
  if (versionId) {
    options.versionId = versionId;
  }

  let prompt = await client.getPrompt(promptName, options);

  // Compile if variables provided
  if (variables.variableValues && variables.variableValues.length > 0) {
    const varsObj: Record<string, string> = {};
    for (const { key, value } of variables.variableValues) {
      if (key) varsObj[key] = value;
    }
    prompt = prompt.compile(varsObj);
  }

  return {
    content: prompt.getContent() as IDataObject | string,
    type: prompt.getType(),
    promptVersionId: prompt.getPromptVersionId(),
  };
}

// Handle Get Experimental Prompt operation
async function handleGetExperimentPrompt(
  ctx: IExecuteFunctions,
  client: LaikaTestClient,
  itemIndex: number
): Promise<IDataObject> {
  const experimentTitle = ctx.getNodeParameter(
    'experimentTitle',
    itemIndex
  ) as string;
  const userId = ctx.getNodeParameter('userId', itemIndex) as string;
  const sessionId = ctx.getNodeParameter('sessionId', itemIndex) as string;
  const additionalContext = ctx.getNodeParameter(
    'additionalContext',
    itemIndex
  ) as { contextValues?: Array<{ key: string; value: string }> };
  const variables = ctx.getNodeParameter('experimentVariables', itemIndex) as {
    variableValues?: Array<{ key: string; value: string }>;
  };

  // Build context object
  const context: Record<string, unknown> = {};
  if (userId) context.userId = userId;
  if (sessionId) context.sessionId = sessionId;

  if (additionalContext.contextValues) {
    for (const { key, value } of additionalContext.contextValues) {
      if (key) context[key] = value;
    }
  }

  let prompt = await client.getExperimentPrompt(experimentTitle, context);

  // Compile if variables provided
  if (variables.variableValues && variables.variableValues.length > 0) {
    const varsObj: Record<string, string> = {};
    for (const { key, value } of variables.variableValues) {
      if (key) varsObj[key] = value;
    }
    prompt = prompt.compile(varsObj);
  }

  return {
    content: prompt.getContent() as IDataObject | string,
    type: prompt.getType(),
    experimentId: prompt.getExperimentId(),
    bucketId: prompt.getBucketId(),
    promptVersionId: prompt.getPromptVersionId(),
    promptId: prompt.getPromptId(),
  };
}

// Handle Push Scores operation
async function handlePushScores(
  ctx: IExecuteFunctions,
  client: LaikaTestClient,
  itemIndex: number
): Promise<IDataObject> {
  const experimentId = ctx.getNodeParameter('experimentId', itemIndex) as string;
  const bucketId = ctx.getNodeParameter('bucketId', itemIndex) as string;
  const promptVersionId = ctx.getNodeParameter('promptVersionId', itemIndex) as string;
  const userId = ctx.getNodeParameter('pushUserId', itemIndex) as string;
  const sessionId = ctx.getNodeParameter('pushSessionId', itemIndex) as string;
  const scoresInput = ctx.getNodeParameter('scores', itemIndex) as {
    scoreValues?: Array<{ name: string; type: string; value: string }>;
  };

  // Validate at least one identifier
  if (!userId && !sessionId) {
    throw new NodeOperationError(
      ctx.getNode(),
      'At least one of User ID or Session ID is required',
      { itemIndex }
    );
  }

  // Validate scores
  if (!scoresInput.scoreValues || scoresInput.scoreValues.length === 0) {
    throw new NodeOperationError(
      ctx.getNode(),
      'At least one score is required',
      { itemIndex }
    );
  }

  // Convert scores to typed format
  const scores: ScoreInput[] = scoresInput.scoreValues.map(convertScore);

  // Build options
  const options: { userId?: string; sessionId?: string } = {};
  if (userId) options.userId = userId;
  if (sessionId) options.sessionId = sessionId;

  const response = await client.pushScore(
    experimentId,
    bucketId,
    promptVersionId,
    scores,
    options as { userId: string } | { sessionId: string } | { userId: string; sessionId: string }
  );

  return {
    success: response.success,
    statusCode: response.statusCode,
    data: response.data as IDataObject,
  };
}

export class LaikaTest implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'LaikaTest',
    name: 'laikaTest',
    icon: 'file:laikatest.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Fetch prompts and push scores to LaikaTest',
    defaults: { name: 'LaikaTest' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'laikaTestApi', required: true }],
    properties: [
      // Operation selector
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Get Prompt',
            value: 'getPrompt',
            description: 'Fetch a prompt by name',
            action: 'Get a prompt',
          },
          {
            name: 'Get Experimental Prompt',
            value: 'getExperimentPrompt',
            description: 'Fetch an A/B tested prompt variant',
            action: 'Get an experimental prompt',
          },
          {
            name: 'Push Scores',
            value: 'pushScores',
            description: 'Send evaluation metrics to LaikaTest',
            action: 'Push scores',
          },
        ],
        default: 'getPrompt',
      },
      // Get Prompt fields
      {
        displayName: 'Prompt Name',
        name: 'promptName',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { operation: ['getPrompt'] } },
        description: 'Name of the prompt template to fetch',
      },
      {
        displayName: 'Version ID',
        name: 'versionId',
        type: 'string',
        default: '',
        displayOptions: { show: { operation: ['getPrompt'] } },
        description: 'Specific version ID to retrieve (optional)',
      },
      {
        displayName: 'Variables',
        name: 'variables',
        type: 'fixedCollection',
        default: {},
        typeOptions: { multipleValues: true },
        displayOptions: { show: { operation: ['getPrompt'] } },
        description: 'Variables to inject into {{placeholder}} syntax',
        options: [
          {
            name: 'variableValues',
            displayName: 'Variable',
            values: [
              {
                displayName: 'Key',
                name: 'key',
                type: 'string',
                default: '',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
              },
            ],
          },
        ],
      },
      // Get Experimental Prompt fields
      {
        displayName: 'Experiment Title',
        name: 'experimentTitle',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { operation: ['getExperimentPrompt'] } },
        description: 'Title of the experiment',
      },
      {
        displayName: 'User ID',
        name: 'userId',
        type: 'string',
        default: '',
        displayOptions: { show: { operation: ['getExperimentPrompt'] } },
        description: 'User identifier for consistent bucketing',
      },
      {
        displayName: 'Session ID',
        name: 'sessionId',
        type: 'string',
        default: '',
        displayOptions: { show: { operation: ['getExperimentPrompt'] } },
        description: 'Session identifier for consistent bucketing',
      },
      {
        displayName: 'Additional Context',
        name: 'additionalContext',
        type: 'fixedCollection',
        default: {},
        typeOptions: { multipleValues: true },
        displayOptions: { show: { operation: ['getExperimentPrompt'] } },
        description: 'Extra context key-value pairs',
        options: [
          {
            name: 'contextValues',
            displayName: 'Context',
            values: [
              {
                displayName: 'Key',
                name: 'key',
                type: 'string',
                default: '',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Variables',
        name: 'experimentVariables',
        type: 'fixedCollection',
        default: {},
        typeOptions: { multipleValues: true },
        displayOptions: { show: { operation: ['getExperimentPrompt'] } },
        description: 'Variables to inject into {{placeholder}} syntax',
        options: [
          {
            name: 'variableValues',
            displayName: 'Variable',
            values: [
              {
                displayName: 'Key',
                name: 'key',
                type: 'string',
                default: '',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
              },
            ],
          },
        ],
      },
      // Push Scores fields
      {
        displayName: 'Experiment ID',
        name: 'experimentId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { operation: ['pushScores'] } },
        description: 'Experiment ID from Get Experimental Prompt',
      },
      {
        displayName: 'Bucket ID',
        name: 'bucketId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { operation: ['pushScores'] } },
        description: 'Bucket ID from Get Experimental Prompt',
      },
      {
        displayName: 'Prompt Version ID',
        name: 'promptVersionId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { operation: ['pushScores'] } },
        description: 'Prompt Version ID from Get Experimental Prompt',
      },
      {
        displayName: 'User ID',
        name: 'pushUserId',
        type: 'string',
        default: '',
        displayOptions: { show: { operation: ['pushScores'] } },
        description: 'User identifier (at least one of User ID or Session ID)',
      },
      {
        displayName: 'Session ID',
        name: 'pushSessionId',
        type: 'string',
        default: '',
        displayOptions: { show: { operation: ['pushScores'] } },
        description: 'Session identifier (at least one of User ID or Session ID)',
      },
      {
        displayName: 'Scores',
        name: 'scores',
        type: 'fixedCollection',
        required: true,
        default: {},
        typeOptions: { multipleValues: true },
        displayOptions: { show: { operation: ['pushScores'] } },
        description: 'Scores to push',
        options: [
          {
            name: 'scoreValues',
            displayName: 'Score',
            values: [
              {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: '',
                description: 'Score metric name',
              },
              {
                displayName: 'Type',
                name: 'type',
                type: 'options',
                options: [
                  { name: 'Integer', value: 'int' },
                  { name: 'Float', value: 'float' },
                  { name: 'Boolean', value: 'bool' },
                  { name: 'String', value: 'string' },
                ],
                default: 'int',
                description: 'Type of the score value',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'Score value',
              },
            ],
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('laikaTestApi');
    const apiKey = credentials.apiKey as string;
    const baseUrl = (credentials.baseUrl as string) || 'https://api.laikatest.com';

    // Create client with caching disabled
    const client = new LaikaTestClient(apiKey, { baseUrl, cacheEnabled: false });

    try {
      for (let i = 0; i < items.length; i++) {
        try {
          const operation = this.getNodeParameter('operation', i) as string;
          let result: IDataObject;

          if (operation === 'getPrompt') {
            result = await handleGetPrompt(this, client, i);
          } else if (operation === 'getExperimentPrompt') {
            result = await handleGetExperimentPrompt(this, client, i);
          } else if (operation === 'pushScores') {
            result = await handlePushScores(this, client, i);
          } else {
            throw new NodeOperationError(
              this.getNode(),
              `Unknown operation: ${operation}`,
              { itemIndex: i }
            );
          }

          returnData.push({ json: result });
        } catch (error) {
          if (this.continueOnFail()) {
            returnData.push({
              json: { error: (error as Error).message },
              pairedItem: { item: i },
            });
            continue;
          }
          throw mapErrorToN8n(error, this, i);
        }
      }
    } finally {
      client.destroy();
    }

    return [returnData];
  }
}
