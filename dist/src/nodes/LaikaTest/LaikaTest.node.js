"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaikaTest = void 0;
const n8n_workflow_1 = require("n8n-workflow");
// Inject variables into {{placeholder}} syntax
function injectVariables(content, variables) {
    if (!variables || Object.keys(variables).length === 0) {
        return content;
    }
    if (typeof content === 'string') {
        return content.replace(/\{\{([^}]+)\}\}/g, (match, name) => {
            const key = name.trim();
            return key in variables ? String(variables[key]) : match;
        });
    }
    if (Array.isArray(content)) {
        return content.map((item) => injectVariables(item, variables));
    }
    if (content && typeof content === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(content)) {
            result[key] = injectVariables(value, variables);
        }
        return result;
    }
    return content;
}
// Generate UUID for score tracking
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
// Convert n8n string inputs to typed score objects
function convertScore(raw) {
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
// Handle Get Prompt operation
async function handleGetPrompt(ctx, itemIndex) {
    const credentials = await ctx.getCredentials('laikaTestApi');
    const apiKey = credentials.apiKey;
    const baseUrl = credentials.baseUrl || 'https://api.laikatest.com';
    const promptName = ctx.getNodeParameter('promptName', itemIndex);
    const versionId = ctx.getNodeParameter('versionId', itemIndex);
    const variables = ctx.getNodeParameter('variables', itemIndex);
    // Build URL
    const encodedName = encodeURIComponent(promptName);
    let url = `${baseUrl}/api/v1/prompts/by-name/${encodedName}`;
    if (versionId) {
        url += `?versionNumber=${encodeURIComponent(versionId)}`;
    }
    const options = {
        method: 'GET',
        url,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        json: true,
    };
    const response = await ctx.helpers.httpRequest(options);
    if (!response.success) {
        throw new n8n_workflow_1.NodeApiError(ctx.getNode(), { message: response.error || 'API error' });
    }
    // Parse content
    const parsedContent = JSON.parse(response.data.content);
    const promptType = response.data.type;
    let content = promptType === 'text' ? parsedContent[0].content : parsedContent;
    // Compile if variables provided
    if (variables.variableValues && variables.variableValues.length > 0) {
        const varsObj = {};
        for (const { key, value } of variables.variableValues) {
            if (key)
                varsObj[key] = value;
        }
        content = injectVariables(content, varsObj);
    }
    return {
        content: content,
        type: promptType,
        promptVersionId: response.data.promptVersionId || null,
    };
}
// Handle Get Experimental Prompt operation
async function handleGetExperimentPrompt(ctx, itemIndex) {
    const credentials = await ctx.getCredentials('laikaTestApi');
    const apiKey = credentials.apiKey;
    const baseUrl = credentials.baseUrl || 'https://api.laikatest.com';
    const experimentTitle = ctx.getNodeParameter('experimentTitle', itemIndex);
    const userId = ctx.getNodeParameter('userId', itemIndex);
    const sessionId = ctx.getNodeParameter('sessionId', itemIndex);
    const additionalContext = ctx.getNodeParameter('additionalContext', itemIndex);
    const variables = ctx.getNodeParameter('experimentVariables', itemIndex);
    // Build context object
    const context = {};
    if (userId)
        context.userId = userId;
    if (sessionId)
        context.sessionId = sessionId;
    if (additionalContext.contextValues) {
        for (const { key, value } of additionalContext.contextValues) {
            if (key)
                context[key] = value;
        }
    }
    const options = {
        method: 'POST',
        url: `${baseUrl}/api/v3/experiments/evaluate`,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: { experimentTitle, context },
        json: true,
    };
    const response = await ctx.helpers.httpRequest(options);
    if (!response.success || !response.data) {
        throw new n8n_workflow_1.NodeApiError(ctx.getNode(), { message: response.error || 'API error' });
    }
    const data = response.data;
    // Parse prompt content
    const parsedContent = JSON.parse(data.prompt.content);
    const promptType = data.prompt.type;
    let content = promptType === 'text' ? parsedContent[0].content : parsedContent;
    // Compile if variables provided
    if (variables.variableValues && variables.variableValues.length > 0) {
        const varsObj = {};
        for (const { key, value } of variables.variableValues) {
            if (key)
                varsObj[key] = value;
        }
        content = injectVariables(content, varsObj);
    }
    return {
        content: content,
        type: promptType,
        experimentId: data.experimentId,
        bucketId: data.bucketId,
        promptVersionId: data.prompt.promptVersionId,
        promptId: data.prompt.promptId,
    };
}
// Handle Push Scores operation
async function handlePushScores(ctx, itemIndex) {
    const credentials = await ctx.getCredentials('laikaTestApi');
    const apiKey = credentials.apiKey;
    const baseUrl = credentials.baseUrl || 'https://api.laikatest.com';
    const experimentId = ctx.getNodeParameter('experimentId', itemIndex);
    const bucketId = ctx.getNodeParameter('bucketId', itemIndex);
    const promptVersionId = ctx.getNodeParameter('promptVersionId', itemIndex);
    const userId = ctx.getNodeParameter('pushUserId', itemIndex);
    const sessionId = ctx.getNodeParameter('pushSessionId', itemIndex);
    const scoresInput = ctx.getNodeParameter('scores', itemIndex);
    // Validate at least one identifier
    if (!userId && !sessionId) {
        throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), 'At least one of User ID or Session ID is required', { itemIndex });
    }
    // Validate scores
    if (!scoresInput.scoreValues || scoresInput.scoreValues.length === 0) {
        throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), 'At least one score is required', { itemIndex });
    }
    // Convert scores to typed format
    const scores = scoresInput.scoreValues.map(convertScore);
    // Build request body
    const requestBody = {
        expId: experimentId,
        bucketId,
        promptVersionId,
        scores,
        source: 'n8n',
        clientVersion: '1.0.0',
        sdkEventId: generateUUID(),
    };
    if (userId)
        requestBody.userId = userId;
    if (sessionId)
        requestBody.sessionId = sessionId;
    const options = {
        method: 'POST',
        url: `${baseUrl}/api/v1/scores`,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: requestBody,
        json: true,
    };
    const response = await ctx.helpers.httpRequest(options);
    return {
        success: response.success || true,
        statusCode: 200,
        data: response.data,
    };
}
class LaikaTest {
    constructor() {
        this.description = {
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
                                { displayName: 'Key', name: 'key', type: 'string', default: '' },
                                { displayName: 'Value', name: 'value', type: 'string', default: '' },
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
                                { displayName: 'Key', name: 'key', type: 'string', default: '' },
                                { displayName: 'Value', name: 'value', type: 'string', default: '' },
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
                                { displayName: 'Key', name: 'key', type: 'string', default: '' },
                                { displayName: 'Value', name: 'value', type: 'string', default: '' },
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
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            try {
                const operation = this.getNodeParameter('operation', i);
                let result;
                if (operation === 'getPrompt') {
                    result = await handleGetPrompt(this, i);
                }
                else if (operation === 'getExperimentPrompt') {
                    result = await handleGetExperimentPrompt(this, i);
                }
                else if (operation === 'pushScores') {
                    result = await handlePushScores(this, i);
                }
                else {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: i });
                }
                returnData.push({ json: result });
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
exports.LaikaTest = LaikaTest;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGFpa2FUZXN0Lm5vZGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbm9kZXMvTGFpa2FUZXN0L0xhaWthVGVzdC5ub2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQVNzQjtBQUV0QiwrQ0FBK0M7QUFDL0MsU0FBUyxlQUFlLENBQ3RCLE9BQW9DLEVBQ3BDLFNBQWlDO0lBRWpDLElBQUksQ0FBQyxTQUFTLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDdEQsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQUVELElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDaEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3pELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN4QixPQUFPLEdBQUcsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQzNCLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFFRCxJQUFJLE9BQU8sSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUMzQyxNQUFNLE1BQU0sR0FBNEIsRUFBRSxDQUFDO1FBQzNDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMs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QkFBc0IsU0FBUyxFQUFFLEVBQ2pDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUNqQixDQUFDO2dCQUNKLENBQUM7Z0JBRUQsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3BDLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNmLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7b0JBQzFCLFVBQVUsQ0FBQyxJQUFJLENBQUM7d0JBQ2QsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFHLEtBQWUsQ0FBQyxPQUFPLEVBQUU7d0JBQ3pDLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUU7cUJBQ3hCLENBQUMsQ0FBQztvQkFDSCxTQUFTO2dCQUNYLENBQUM7Z0JBQ0QsTUFBTSxLQUFLLENBQUM7WUFDZCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN0QixDQUFDO0NBQ0Y7QUFqUkQsOEJBaVJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgSUV4ZWN1dGVGdW5jdGlvbnMsXG4gIElEYXRhT2JqZWN0LFxuICBJTm9kZUV4ZWN1dGlvbkRhdGEsXG4gIElOb2RlVHlwZSxcbiAgSU5vZGVUeXBlRGVzY3JpcHRpb24sXG4gIE5vZGVBcGlFcnJvcixcbiAgTm9kZU9wZXJhdGlvbkVycm9yLFxuICBJSHR0cFJlcXVlc3RPcHRpb25zLFxufSBmcm9tICduOG4td29ya2Zsb3cnO1xuXG4vLyBJbmplY3QgdmFyaWFibGVzIGludG8ge3twbGFjZWhvbGRlcn19IHN5bnRheFxuZnVuY3Rpb24gaW5qZWN0VmFyaWFibGVzKFxuICBjb250ZW50OiBzdHJpbmcgfCBvYmplY3QgfCB1bmtub3duW10sXG4gIHZhcmlhYmxlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogc3RyaW5nIHwgb2JqZWN0IHwgdW5rbm93bltdIHtcbiAgaWYgKCF2YXJpYWJsZXMgfHwgT2JqZWN0LmtleXModmFyaWFibGVzKS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gY29udGVudDtcbiAgfVxuXG4gIGlmICh0eXBlb2YgY29udGVudCA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gY29udGVudC5yZXBsYWNlKC9cXHtcXHsoW159XSspXFx9XFx9L2csIChtYXRjaCwgbmFtZSkgPT4ge1xuICAgICAgY29uc3Qga2V5ID0gbmFtZS50cmltKCk7XG4gICAgICByZXR1cm4ga2V5IGluIHZhcmlhYmxlcyA/IFN0cmluZyh2YXJpYWJsZXNba2V5XSkgOiBtYXRjaDtcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KGNvbnRlbnQpKSB7XG4gICAgcmV0dXJuIGNvbnRlbnQubWFwKChpdGVtKSA9PiBpbmplY3RWYXJpYWJsZXMoaXRlbSBhcyBzdHJpbmcsIHZhcmlhYmxlcykpO1xuICB9XG5cbiAgaWYgKGNvbnRlbnQgJiYgdHlwZW9mIGNvbnRlbnQgPT09ICdvYmplY3QnKSB7XG4gICAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGNvbnRlbnQpKSB7XG4gICAgICByZXN1bHRba2V5XSA9IGluamVjdFZhcmlhYmxlcyh2YWx1ZSBhcyBzdHJpbmcsIHZhcmlhYmxlcyk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICByZXR1cm4gY29udGVudDtcbn1cblxuLy8gR2VuZXJhdGUgVVVJRCBmb3Igc2NvcmUgdHJhY2tpbmdcbmZ1bmN0aW9uIGdlbmVyYXRlVVVJRCgpOiBzdHJpbmcge1xuICByZXR1cm4gJ3h4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eCcucmVwbGFjZSgvW3h5XS9nLCAoYykgPT4ge1xuICAgIGNvbnN0IHIgPSAoTWF0aC5yYW5kb20oKSAqIDE2KSB8IDA7XG4gICAgY29uc3QgdiA9IGMgPT09ICd4JyA/IHIgOiAociAmIDB4MykgfCAweDg7XG4gICAgcmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuICB9KTtcbn1cblxuLy8gU2NvcmUgaW5wdXQgdHlwZVxuaW50ZXJmYWNlIFNjb3JlSW5wdXQge1xuICBuYW1lOiBzdHJpbmc7XG4gIHR5cGU6ICdpbnQnIHwgJ2Zsb2F0JyB8ICdib29sJyB8ICdzdHJpbmcnO1xuICB2YWx1ZTogbnVtYmVyIHwgYm9vbGVhbiB8IHN0cmluZztcbn1cblxuLy8gQ29udmVydCBuOG4gc3RyaW5nIGlucHV0cyB0byB0eXBlZCBzY29yZSBvYmplY3RzXG5mdW5jdGlvbiBjb252ZXJ0U2NvcmUocmF3OiB7XG4gIG5hbWU6IHN0cmluZztcbiAgdHlwZTogc3RyaW5nO1xuICB2YWx1ZTogc3RyaW5nO1xufSk6IFNjb3JlSW5wdXQge1xuICBjb25zdCB7IG5hbWUsIHR5cGUsIHZhbHVlIH0gPSByYXc7XG5cbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAnaW50Jzoge1xuICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VJbnQodmFsdWUsIDEwKTtcbiAgICAgIGlmIChpc05hTihwYXJzZWQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBpbnQgdmFsdWUgXCIke3ZhbHVlfVwiIGZvciBzY29yZSBcIiR7bmFtZX1cImApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHsgbmFtZSwgdHlwZTogJ2ludCcsIHZhbHVlOiBwYXJzZWQgfTtcbiAgICB9XG4gICAgY2FzZSAnZmxvYXQnOiB7XG4gICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUZsb2F0KHZhbHVlKTtcbiAgICAgIGlmIChpc05hTihwYXJzZWQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBmbG9hdCB2YWx1ZSBcIiR7dmFsdWV9XCIgZm9yIHNjb3JlIFwiJHtuYW1lfVwiYCk7XG4gICAgICB9XG4gICAgICByZXR1cm4geyBuYW1lLCB0eXBlOiAnZmxvYXQnLCB2YWx1ZTogcGFyc2VkIH07XG4gICAgfVxuICAgIGNhc2UgJ2Jvb2wnOiB7XG4gICAgICBjb25zdCBsb3dlciA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XG4gICAgICBpZiAobG93ZXIgIT09ICd0cnVlJyAmJiBsb3dlciAhPT0gJ2ZhbHNlJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgYm9vbCB2YWx1ZSBcIiR7dmFsdWV9XCIgZm9yIHNjb3JlIFwiJHtuYW1lfVwiYCk7XG4gICAgICB9XG4gICAgICByZXR1cm4geyBuYW1lLCB0eXBlOiAnYm9vbCcsIHZhbHVlOiBsb3dlciA9PT0gJ3RydWUnIH07XG4gICAgfVxuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICByZXR1cm4geyBuYW1lLCB0eXBlOiAnc3RyaW5nJywgdmFsdWUgfTtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHNjb3JlIHR5cGUgXCIke3R5cGV9XCIgZm9yIHNjb3JlIFwiJHtuYW1lfVwiYCk7XG4gIH1cbn1cblxuLy8gSGFuZGxlIEdldCBQcm9tcHQgb3BlcmF0aW9uXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVHZXRQcm9tcHQoXG4gIGN0eDogSUV4ZWN1dGVGdW5jdGlvbnMsXG4gIGl0ZW1JbmRleDogbnVtYmVyXG4pOiBQcm9taXNlPElEYXRhT2JqZWN0PiB7XG4gIGNvbnN0IGNyZWRlbnRpYWxzID0gYXdhaXQgY3R4LmdldENyZWRlbnRpYWxzKCdsYWlrYVRlc3RBcGknKTtcbiAgY29uc3QgYXBpS2V5ID0gY3JlZGVudGlhbHMuYXBpS2V5IGFzIHN0cmluZztcbiAgY29uc3QgYmFzZVVybCA9IChjcmVkZW50aWFscy5iYXNlVXJsIGFzIHN0cmluZykgfHwgJ2h0dHBzOi8vYXBpLmxhaWthdGVzdC5jb20nO1xuXG4gIGNvbnN0IHByb21wdE5hbWUgPSBjdHguZ2V0Tm9kZVBhcmFtZXRlcigncHJvbXB0TmFtZScsIGl0ZW1JbmRleCkgYXMgc3RyaW5nO1xuICBjb25zdCB2ZXJzaW9uSWQgPSBjdHguZ2V0Tm9kZVBhcmFtZXRlcigndmVyc2lvbklkJywgaXRlbUluZGV4KSBhcyBzdHJpbmc7XG4gIGNvbnN0IHZhcmlhYmxlcyA9IGN0eC5nZXROb2RlUGFyYW1ldGVyKCd2YXJpYWJsZXMnLCBpdGVtSW5kZXgpIGFzIHtcbiAgICB2YXJpYWJsZVZhbHVlcz86IEFycmF5PHsga2V5OiBzdHJpbmc7IHZhbHVlOiBzdHJpbmcgfT47XG4gIH07XG5cbiAgLy8gQnVpbGQgVVJMXG4gIGNvbnN0IGVuY29kZWROYW1lID0gZW5jb2RlVVJJQ29tcG9uZW50KHByb21wdE5hbWUpO1xuICBsZXQgdXJsID0gYCR7YmFzZVVybH0vYXBpL3YxL3Byb21wdHMvYnktbmFtZS8ke2VuY29kZWROYW1lfWA7XG4gIGlmICh2ZXJzaW9uSWQpIHtcbiAgICB1cmwgKz0gYD92ZXJzaW9uTnVtYmVyPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHZlcnNpb25JZCl9YDtcbiAgfVxuXG4gIGNvbnN0IG9wdGlvbnM6IElIdHRwUmVxdWVzdE9wdGlvbnMgPSB7XG4gICAgbWV0aG9kOiAnR0VUJyxcbiAgICB1cmwsXG4gICAgaGVhZGVyczoge1xuICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2FwaUtleX1gLFxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICB9LFxuICAgIGpzb246IHRydWUsXG4gIH07XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjdHguaGVscGVycy5odHRwUmVxdWVzdChvcHRpb25zKTtcblxuICBpZiAoIXJlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICB0aHJvdyBuZXcgTm9kZUFwaUVycm9yKGN0eC5nZXROb2RlKCksIHsgbWVzc2FnZTogcmVzcG9uc2UuZXJyb3IgfHwgJ0FQSSBlcnJvcicgfSk7XG4gIH1cblxuICAvLyBQYXJzZSBjb250ZW50XG4gIGNvbnN0IHBhcnNlZENvbnRlbnQgPSBKU09OLnBhcnNlKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gIGNvbnN0IHByb21wdFR5cGUgPSByZXNwb25zZS5kYXRhLnR5cGU7XG4gIGxldCBjb250ZW50ID0gcHJvbXB0VHlwZSA9PT0gJ3RleHQnID8gcGFyc2VkQ29udGVudFswXS5jb250ZW50IDogcGFyc2VkQ29udGVudDtcblxuICAvLyBDb21waWxlIGlmIHZhcmlhYmxlcyBwcm92aWRlZFxuICBpZiAodmFyaWFibGVzLnZhcmlhYmxlVmFsdWVzICYmIHZhcmlhYmxlcy52YXJpYWJsZVZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgdmFyc09iajogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGZvciAoY29uc3QgeyBrZXksIHZhbHVlIH0gb2YgdmFyaWFibGVzLnZhcmlhYmxlVmFsdWVzKSB7XG4gICAgICBpZiAoa2V5KSB2YXJzT2JqW2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gICAgY29udGVudCA9IGluamVjdFZhcmlhYmxlcyhjb250ZW50LCB2YXJzT2JqKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY29udGVudDogY29udGVudCBhcyBJRGF0YU9iamVjdCB8IHN0cmluZyxcbiAgICB0eXBlOiBwcm9tcHRUeXBlLFxuICAgIHByb21wdFZlcnNpb25JZDogcmVzcG9uc2UuZGF0YS5wcm9tcHRWZXJzaW9uSWQgfHwgbnVsbCxcbiAgfTtcbn1cblxuLy8gSGFuZGxlIEdldCBFeHBlcmltZW50YWwgUHJvbXB0IG9wZXJhdGlvblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlR2V0RXhwZXJpbWVudFByb21wdChcbiAgY3R4OiBJRXhlY3V0ZUZ1bmN0aW9ucyxcbiAgaXRlbUluZGV4OiBudW1iZXJcbik6IFByb21pc2U8SURhdGFPYmplY3Q+IHtcbiAgY29uc3QgY3JlZGVudGlhbHMgPSBhd2FpdCBjdHguZ2V0Q3JlZGVudGlhbHMoJ2xhaWthVGVzdEFwaScpO1xuICBjb25zdCBhcGlLZXkgPSBjcmVkZW50aWFscy5hcGlLZXkgYXMgc3RyaW5nO1xuICBjb25zdCBiYXNlVXJsID0gKGNyZWRlbnRpYWxzLmJhc2VVcmwgYXMgc3RyaW5nKSB8fCAnaHR0cHM6Ly9hcGkubGFpa2F0ZXN0LmNvbSc7XG5cbiAgY29uc3QgZXhwZXJpbWVudFRpdGxlID0gY3R4LmdldE5vZGVQYXJhbWV0ZXIoJ2V4cGVyaW1lbnRUaXRsZScsIGl0ZW1JbmRleCkgYXMgc3RyaW5nO1xuICBjb25zdCB1c2VySWQgPSBjdHguZ2V0Tm9kZVBhcmFtZXRlcigndXNlcklkJywgaXRlbUluZGV4KSBhcyBzdHJpbmc7XG4gIGNvbnN0IHNlc3Npb25JZCA9IGN0eC5nZXROb2RlUGFyYW1ldGVyKCdzZXNzaW9uSWQnLCBpdGVtSW5kZXgpIGFzIHN0cmluZztcbiAgY29uc3QgYWRkaXRpb25hbENvbnRleHQgPSBjdHguZ2V0Tm9kZVBhcmFtZXRlcignYWRkaXRpb25hbENvbnRleHQnLCBpdGVtSW5kZXgpIGFzIHtcbiAgICBjb250ZXh0VmFsdWVzPzogQXJyYXk8eyBrZXk6IHN0cmluZzsgdmFsdWU6IHN0cmluZyB9PjtcbiAgfTtcbiAgY29uc3QgdmFyaWFibGVzID0gY3R4LmdldE5vZGVQYXJhbWV0ZXIoJ2V4cGVyaW1lbnRWYXJpYWJsZXMnLCBpdGVtSW5kZXgpIGFzIHtcbiAgICB2YXJpYWJsZVZhbHVlcz86IEFycmF5PHsga2V5OiBzdHJpbmc7IHZhbHVlOiBzdHJpbmcgfT47XG4gIH07XG5cbiAgLy8gQnVpbGQgY29udGV4dCBvYmplY3RcbiAgY29uc3QgY29udGV4dDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgaWYgKHVzZXJJZCkgY29udGV4dC51c2VySWQgPSB1c2VySWQ7XG4gIGlmIChzZXNzaW9uSWQpIGNvbnRleHQuc2Vzc2lvbklkID0gc2Vzc2lvbklkO1xuXG4gIGlmIChhZGRpdGlvbmFsQ29udGV4dC5jb250ZXh0VmFsdWVzKSB7XG4gICAgZm9yIChjb25zdCB7IGtleSwgdmFsdWUgfSBvZiBhZGRpdGlvbmFsQ29udGV4dC5jb250ZXh0VmFsdWVzKSB7XG4gICAgICBpZiAoa2V5KSBjb250ZXh0W2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBvcHRpb25zOiBJSHR0cFJlcXVlc3RPcHRpb25zID0ge1xuICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgIHVybDogYCR7YmFzZVVybH0vYXBpL3YzL2V4cGVyaW1lbnRzL2V2YWx1YXRlYCxcbiAgICBoZWFkZXJzOiB7XG4gICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7YXBpS2V5fWAsXG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgIH0sXG4gICAgYm9keTogeyBleHBlcmltZW50VGl0bGUsIGNvbnRleHQgfSxcbiAgICBqc29uOiB0cnVlLFxuICB9O1xuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY3R4LmhlbHBlcnMuaHR0cFJlcXVlc3Qob3B0aW9ucyk7XG5cbiAgaWYgKCFyZXNwb25zZS5zdWNjZXNzIHx8ICFyZXNwb25zZS5kYXRhKSB7XG4gICAgdGhyb3cgbmV3IE5vZGVBcGlFcnJvcihjdHguZ2V0Tm9kZSgpLCB7IG1lc3NhZ2U6IHJlc3BvbnNlLmVycm9yIHx8ICdBUEkgZXJyb3InIH0pO1xuICB9XG5cbiAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgLy8gUGFyc2UgcHJvbXB0IGNvbnRlbnRcbiAgY29uc3QgcGFyc2VkQ29udGVudCA9IEpTT04ucGFyc2UoZGF0YS5wcm9tcHQuY29udGVudCk7XG4gIGNvbnN0IHByb21wdFR5cGUgPSBkYXRhLnByb21wdC50eXBlO1xuICBsZXQgY29udGVudCA9IHByb21wdFR5cGUgPT09ICd0ZXh0JyA/IHBhcnNlZENvbnRlbnRbMF0uY29udGVudCA6IHBhcnNlZENvbnRlbnQ7XG5cbiAgLy8gQ29tcGlsZSBpZiB2YXJpYWJsZXMgcHJvdmlkZWRcbiAgaWYgKHZhcmlhYmxlcy52YXJpYWJsZVZhbHVlcyAmJiB2YXJpYWJsZXMudmFyaWFibGVWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHZhcnNPYmo6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHsga2V5LCB2YWx1ZSB9IG9mIHZhcmlhYmxlcy52YXJpYWJsZVZhbHVlcykge1xuICAgICAgaWYgKGtleSkgdmFyc09ialtrZXldID0gdmFsdWU7XG4gICAgfVxuICAgIGNvbnRlbnQgPSBpbmplY3RWYXJpYWJsZXMoY29udGVudCwgdmFyc09iaik7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGNvbnRlbnQ6IGNvbnRlbnQgYXMgSURhdGFPYmplY3QgfCBzdHJpbmcsXG4gICAgdHlwZTogcHJvbXB0VHlwZSxcbiAgICBleHBlcmltZW50SWQ6IGRhdGEuZXhwZXJpbWVudElkLFxuICAgIGJ1Y2tldElkOiBkYXRhLmJ1Y2tldElkLFxuICAgIHByb21wdFZlcnNpb25JZDogZGF0YS5wcm9tcHQucHJvbXB0VmVyc2lvbklkLFxuICAgIHByb21wdElkOiBkYXRhLnByb21wdC5wcm9tcHRJZCxcbiAgfTtcbn1cblxuLy8gSGFuZGxlIFB1c2ggU2NvcmVzIG9wZXJhdGlvblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUHVzaFNjb3JlcyhcbiAgY3R4OiBJRXhlY3V0ZUZ1bmN0aW9ucyxcbiAgaXRlbUluZGV4OiBudW1iZXJcbik6IFByb21pc2U8SURhdGFPYmplY3Q+IHtcbiAgY29uc3QgY3JlZGVudGlhbHMgPSBhd2FpdCBjdHguZ2V0Q3JlZGVudGlhbHMoJ2xhaWthVGVzdEFwaScpO1xuICBjb25zdCBhcGlLZXkgPSBjcmVkZW50aWFscy5hcGlLZXkgYXMgc3RyaW5nO1xuICBjb25zdCBiYXNlVXJsID0gKGNyZWRlbnRpYWxzLmJhc2VVcmwgYXMgc3RyaW5nKSB8fCAnaHR0cHM6Ly9hcGkubGFpa2F0ZXN0LmNvbSc7XG5cbiAgY29uc3QgZXhwZXJpbWVudElkID0gY3R4LmdldE5vZGVQYXJhbWV0ZXIoJ2V4cGVyaW1lbnRJZCcsIGl0ZW1JbmRleCkgYXMgc3RyaW5nO1xuICBjb25zdCBidWNrZXRJZCA9IGN0eC5nZXROb2RlUGFyYW1ldGVyKCdidWNrZXRJZCcsIGl0ZW1JbmRleCkgYXMgc3RyaW5nO1xuICBjb25zdCBwcm9tcHRWZXJzaW9uSWQgPSBjdHguZ2V0Tm9kZVBhcmFtZXRlcigncHJvbXB0VmVyc2lvbklkJywgaXRlbUluZGV4KSBhcyBzdHJpbmc7XG4gIGNvbnN0IHVzZXJJZCA9IGN0eC5nZXROb2RlUGFyYW1ldGVyKCdwdXNoVXNlcklkJywgaXRlbUluZGV4KSBhcyBzdHJpbmc7XG4gIGNvbnN0IHNlc3Npb25JZCA9IGN0eC5nZXROb2RlUGFyYW1ldGVyKCdwdXNoU2Vzc2lvbklkJywgaXRlbUluZGV4KSBhcyBzdHJpbmc7XG4gIGNvbnN0IHNjb3Jlc0lucHV0ID0gY3R4LmdldE5vZGVQYXJhbWV0ZXIoJ3Njb3JlcycsIGl0ZW1JbmRleCkgYXMge1xuICAgIHNjb3JlVmFsdWVzPzogQXJyYXk8eyBuYW1lOiBzdHJpbmc7IHR5cGU6IHN0cmluZzsgdmFsdWU6IHN0cmluZyB9PjtcbiAgfTtcblxuICAvLyBWYWxpZGF0ZSBhdCBsZWFzdCBvbmUgaWRlbnRpZmllclxuICBpZiAoIXVzZXJJZCAmJiAhc2Vzc2lvbklkKSB7XG4gICAgdGhyb3cgbmV3IE5vZGVPcGVyYXRpb25FcnJvcihcbiAgICAgIGN0eC5nZXROb2RlKCksXG4gICAgICAnQXQgbGVhc3Qgb25lIG9mIFVzZXIgSUQgb3IgU2Vzc2lvbiBJRCBpcyByZXF1aXJlZCcsXG4gICAgICB7IGl0ZW1JbmRleCB9XG4gICAgKTtcbiAgfVxuXG4gIC8vIFZhbGlkYXRlIHNjb3Jlc1xuICBpZiAoIXNjb3Jlc0lucHV0LnNjb3JlVmFsdWVzIHx8IHNjb3Jlc0lucHV0LnNjb3JlVmFsdWVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBOb2RlT3BlcmF0aW9uRXJyb3IoXG4gICAgICBjdHguZ2V0Tm9kZSgpLFxuICAgICAgJ0F0IGxlYXN0IG9uZSBzY29yZSBpcyByZXF1aXJlZCcsXG4gICAgICB7IGl0ZW1JbmRleCB9XG4gICAgKTtcbiAgfVxuXG4gIC8vIENvbnZlcnQgc2NvcmVzIHRvIHR5cGVkIGZvcm1hdFxuICBjb25zdCBzY29yZXM6IFNjb3JlSW5wdXRbXSA9IHNjb3Jlc0lucHV0LnNjb3JlVmFsdWVzLm1hcChjb252ZXJ0U2NvcmUpO1xuXG4gIC8vIEJ1aWxkIHJlcXVlc3QgYm9keVxuICBjb25zdCByZXF1ZXN0Qm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7XG4gICAgZXhwSWQ6IGV4cGVyaW1lbnRJZCxcbiAgICBidWNrZXRJZCxcbiAgICBwcm9tcHRWZXJzaW9uSWQsXG4gICAgc2NvcmVzLFxuICAgIHNvdXJjZTogJ244bicsXG4gICAgY2xpZW50VmVyc2lvbjogJzEuMC4wJyxcbiAgICBzZGtFdmVudElkOiBnZW5lcmF0ZVVVSUQoKSxcbiAgfTtcblxuICBpZiAodXNlcklkKSByZXF1ZXN0Qm9keS51c2VySWQgPSB1c2VySWQ7XG4gIGlmIChzZXNzaW9uSWQpIHJlcXVlc3RCb2R5LnNlc3Npb25JZCA9IHNlc3Npb25JZDtcblxuICBjb25zdCBvcHRpb25zOiBJSHR0cFJlcXVlc3RPcHRpb25zID0ge1xuICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgIHVybDogYCR7YmFzZVVybH0vYXBpL3YxL3Njb3Jlc2AsXG4gICAgaGVhZGVyczoge1xuICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2FwaUtleX1gLFxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICB9LFxuICAgIGJvZHk6IHJlcXVlc3RCb2R5LFxuICAgIGpzb246IHRydWUsXG4gIH07XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjdHguaGVscGVycy5odHRwUmVxdWVzdChvcHRpb25zKTtcblxuICByZXR1cm4ge1xuICAgIHN1Y2Nlc3M6IHJlc3BvbnNlLnN1Y2Nlc3MgfHwgdHJ1ZSxcbiAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgZGF0YTogcmVzcG9uc2UuZGF0YSBhcyBJRGF0YU9iamVjdCxcbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIExhaWthVGVzdCBpbXBsZW1lbnRzIElOb2RlVHlwZSB7XG4gIGRlc2NyaXB0aW9uOiBJTm9kZVR5cGVEZXNjcmlwdGlvbiA9IHtcbiAgICBkaXNwbGF5TmFtZTogJ0xhaWthVGVzdCcsXG4gICAgbmFtZTogJ2xhaWthVGVzdCcsXG4gICAgaWNvbjogJ2ZpbGU6bGFpa2F0ZXN0LnN2ZycsXG4gICAgZ3JvdXA6IFsndHJhbnNmb3JtJ10sXG4gICAgdmVyc2lvbjogMSxcbiAgICBzdWJ0aXRsZTogJz17eyRwYXJhbWV0ZXJbXCJvcGVyYXRpb25cIl19fScsXG4gICAgZGVzY3JpcHRpb246ICdGZXRjaCBwcm9tcHRzIGFuZCBwdXNoIHNjb3JlcyB0byBMYWlrYVRlc3QnLFxuICAgIGRlZmF1bHRzOiB7IG5hbWU6ICdMYWlrYVRlc3QnIH0sXG4gICAgaW5wdXRzOiBbJ21haW4nXSxcbiAgICBvdXRwdXRzOiBbJ21haW4nXSxcbiAgICBjcmVkZW50aWFsczogW3sgbmFtZTogJ2xhaWthVGVzdEFwaScsIHJlcXVpcmVkOiB0cnVlIH1dLFxuICAgIHByb3BlcnRpZXM6IFtcbiAgICAgIC8vIE9wZXJhdGlvbiBzZWxlY3RvclxuICAgICAge1xuICAgICAgICBkaXNwbGF5TmFtZTogJ09wZXJhdGlvbicsXG4gICAgICAgIG5hbWU6ICdvcGVyYXRpb24nLFxuICAgICAgICB0eXBlOiAnb3B0aW9ucycsXG4gICAgICAgIG5vRGF0YUV4cHJlc3Npb246IHRydWUsXG4gICAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiAnR2V0IFByb21wdCcsXG4gICAgICAgICAgICB2YWx1ZTogJ2dldFByb21wdCcsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZldGNoIGEgcHJvbXB0IGJ5IG5hbWUnLFxuICAgICAgICAgICAgYWN0aW9uOiAnR2V0IGEgcHJvbXB0JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdHZXQgRXhwZXJpbWVudGFsIFByb21wdCcsXG4gICAgICAgICAgICB2YWx1ZTogJ2dldEV4cGVyaW1lbnRQcm9tcHQnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGZXRjaCBhbiBBL0IgdGVzdGVkIHByb21wdCB2YXJpYW50JyxcbiAgICAgICAgICAgIGFjdGlvbjogJ0dldCBhbiBleHBlcmltZW50YWwgcHJvbXB0JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdQdXNoIFNjb3JlcycsXG4gICAgICAgICAgICB2YWx1ZTogJ3B1c2hTY29yZXMnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZW5kIGV2YWx1YXRpb24gbWV0cmljcyB0byBMYWlrYVRlc3QnLFxuICAgICAgICAgICAgYWN0aW9uOiAnUHVzaCBzY29yZXMnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIGRlZmF1bHQ6ICdnZXRQcm9tcHQnLFxuICAgICAgfSxcbiAgICAgIC8vIEdldCBQcm9tcHQgZmllbGRzXG4gICAgICB7XG4gICAgICAgIGRpc3BsYXlOYW1lOiAnUHJvbXB0IE5hbWUnLFxuICAgICAgICBuYW1lOiAncHJvbXB0TmFtZScsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgZGVmYXVsdDogJycsXG4gICAgICAgIGRpc3BsYXlPcHRpb25zOiB7IHNob3c6IHsgb3BlcmF0aW9uOiBbJ2dldFByb21wdCddIH0gfSxcbiAgICAgICAgZGVzY3JpcHRpb246ICdOYW1lIG9mIHRoZSBwcm9tcHQgdGVtcGxhdGUgdG8gZmV0Y2gnLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZGlzcGxheU5hbWU6ICdWZXJzaW9uIElEJyxcbiAgICAgICAgbmFtZTogJ3ZlcnNpb25JZCcsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBkZWZhdWx0OiAnJyxcbiAgICAgICAgZGlzcGxheU9wdGlvbnM6IHsgc2hvdzogeyBvcGVyYXRpb246IFsnZ2V0UHJvbXB0J10gfSB9LFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1NwZWNpZmljIHZlcnNpb24gSUQgdG8gcmV0cmlldmUgKG9wdGlvbmFsKScsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBkaXNwbGF5TmFtZTogJ1ZhcmlhYmxlcycsXG4gICAgICAgIG5hbWU6ICd2YXJpYWJsZXMnLFxuICAgICAgICB0eXBlOiAnZml4ZWRDb2xsZWN0aW9uJyxcbiAgICAgICAgZGVmYXVsdDoge30sXG4gICAgICAgIHR5cGVPcHRpb25zOiB7IG11bHRpcGxlVmFsdWVzOiB0cnVlIH0sXG4gICAgICAgIGRpc3BsYXlPcHRpb25zOiB7IHNob3c6IHsgb3BlcmF0aW9uOiBbJ2dldFByb21wdCddIH0gfSxcbiAgICAgICAgZGVzY3JpcHRpb246ICdWYXJpYWJsZXMgdG8gaW5qZWN0IGludG8ge3twbGFjZWhvbGRlcn19IHN5bnRheCcsXG4gICAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiAndmFyaWFibGVWYWx1ZXMnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdWYXJpYWJsZScsXG4gICAgICAgICAgICB2YWx1ZXM6IFtcbiAgICAgICAgICAgICAgeyBkaXNwbGF5TmFtZTogJ0tleScsIG5hbWU6ICdrZXknLCB0eXBlOiAnc3RyaW5nJywgZGVmYXVsdDogJycgfSxcbiAgICAgICAgICAgICAgeyBkaXNwbGF5TmFtZTogJ1ZhbHVlJywgbmFtZTogJ3ZhbHVlJywgdHlwZTogJ3N0cmluZycsIGRlZmF1bHQ6ICcnIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgLy8gR2V0IEV4cGVyaW1lbnRhbCBQcm9tcHQgZmllbGRzXG4gICAgICB7XG4gICAgICAgIGRpc3BsYXlOYW1lOiAnRXhwZXJpbWVudCBUaXRsZScsXG4gICAgICAgIG5hbWU6ICdleHBlcmltZW50VGl0bGUnLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgIGRlZmF1bHQ6ICcnLFxuICAgICAgICBkaXNwbGF5T3B0aW9uczogeyBzaG93OiB7IG9wZXJhdGlvbjogWydnZXRFeHBlcmltZW50UHJvbXB0J10gfSB9LFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1RpdGxlIG9mIHRoZSBleHBlcmltZW50JyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGRpc3BsYXlOYW1lOiAnVXNlciBJRCcsXG4gICAgICAgIG5hbWU6ICd1c2VySWQnLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgZGVmYXVsdDogJycsXG4gICAgICAgIGRpc3BsYXlPcHRpb25zOiB7IHNob3c6IHsgb3BlcmF0aW9uOiBbJ2dldEV4cGVyaW1lbnRQcm9tcHQnXSB9IH0sXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnVXNlciBpZGVudGlmaWVyIGZvciBjb25zaXN0ZW50IGJ1Y2tldGluZycsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBkaXNwbGF5TmFtZTogJ1Nlc3Npb24gSUQnLFxuICAgICAgICBuYW1lOiAnc2Vzc2lvbklkJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGRlZmF1bHQ6ICcnLFxuICAgICAgICBkaXNwbGF5T3B0aW9uczogeyBzaG93OiB7IG9wZXJhdGlvbjogWydnZXRFeHBlcmltZW50UHJvbXB0J10gfSB9LFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Nlc3Npb24gaWRlbnRpZmllciBmb3IgY29uc2lzdGVudCBidWNrZXRpbmcnLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZGlzcGxheU5hbWU6ICdBZGRpdGlvbmFsIENvbnRleHQnLFxuICAgICAgICBuYW1lOiAnYWRkaXRpb25hbENvbnRleHQnLFxuICAgICAgICB0eXBlOiAnZml4ZWRDb2xsZWN0aW9uJyxcbiAgICAgICAgZGVmYXVsdDoge30sXG4gICAgICAgIHR5cGVPcHRpb25zOiB7IG11bHRpcGxlVmFsdWVzOiB0cnVlIH0sXG4gICAgICAgIGRpc3BsYXlPcHRpb25zOiB7IHNob3c6IHsgb3BlcmF0aW9uOiBbJ2dldEV4cGVyaW1lbnRQcm9tcHQnXSB9IH0sXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRXh0cmEgY29udGV4dCBrZXktdmFsdWUgcGFpcnMnLFxuICAgICAgICBvcHRpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogJ2NvbnRleHRWYWx1ZXMnLFxuICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdDb250ZXh0JyxcbiAgICAgICAgICAgIHZhbHVlczogW1xuICAgICAgICAgICAgICB7IGRpc3BsYXlOYW1lOiAnS2V5JywgbmFtZTogJ2tleScsIHR5cGU6ICdzdHJpbmcnLCBkZWZhdWx0OiAnJyB9LFxuICAgICAgICAgICAgICB7IGRpc3BsYXlOYW1lOiAnVmFsdWUnLCBuYW1lOiAndmFsdWUnLCB0eXBlOiAnc3RyaW5nJywgZGVmYXVsdDogJycgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGRpc3BsYXlOYW1lOiAnVmFyaWFibGVzJyxcbiAgICAgICAgbmFtZTogJ2V4cGVyaW1lbnRWYXJpYWJsZXMnLFxuICAgICAgICB0eXBlOiAnZml4ZWRDb2xsZWN0aW9uJyxcbiAgICAgICAgZGVmYXVsdDoge30sXG4gICAgICAgIHR5cGVPcHRpb25zOiB7IG11bHRpcGxlVmFsdWVzOiB0cnVlIH0sXG4gICAgICAgIGRpc3BsYXlPcHRpb25zOiB7IHNob3c6IHsgb3BlcmF0aW9uOiBbJ2dldEV4cGVyaW1lbnRQcm9tcHQnXSB9IH0sXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnVmFyaWFibGVzIHRvIGluamVjdCBpbnRvIHt7cGxhY2Vob2xkZXJ9fSBzeW50YXgnLFxuICAgICAgICBvcHRpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogJ3ZhcmlhYmxlVmFsdWVzJyxcbiAgICAgICAgICAgIGRpc3BsYXlOYW1lOiAnVmFyaWFibGUnLFxuICAgICAgICAgICAgdmFsdWVzOiBbXG4gICAgICAgICAgICAgIHsgZGlzcGxheU5hbWU6ICdLZXknLCBuYW1lOiAna2V5JywgdHlwZTogJ3N0cmluZycsIGRlZmF1bHQ6ICcnIH0sXG4gICAgICAgICAgICAgIHsgZGlzcGxheU5hbWU6ICdWYWx1ZScsIG5hbWU6ICd2YWx1ZScsIHR5cGU6ICdzdHJpbmcnLCBkZWZhdWx0OiAnJyB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIC8vIFB1c2ggU2NvcmVzIGZpZWxkc1xuICAgICAge1xuICAgICAgICBkaXNwbGF5TmFtZTogJ0V4cGVyaW1lbnQgSUQnLFxuICAgICAgICBuYW1lOiAnZXhwZXJpbWVudElkJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICBkZWZhdWx0OiAnJyxcbiAgICAgICAgZGlzcGxheU9wdGlvbnM6IHsgc2hvdzogeyBvcGVyYXRpb246IFsncHVzaFNjb3JlcyddIH0gfSxcbiAgICAgICAgZGVzY3JpcHRpb246ICdFeHBlcmltZW50IElEIGZyb20gR2V0IEV4cGVyaW1lbnRhbCBQcm9tcHQnLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZGlzcGxheU5hbWU6ICdCdWNrZXQgSUQnLFxuICAgICAgICBuYW1lOiAnYnVja2V0SWQnLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgIGRlZmF1bHQ6ICcnLFxuICAgICAgICBkaXNwbGF5T3B0aW9uczogeyBzaG93OiB7IG9wZXJhdGlvbjogWydwdXNoU2NvcmVzJ10gfSB9LFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0J1Y2tldCBJRCBmcm9tIEdldCBFeHBlcmltZW50YWwgUHJvbXB0JyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGRpc3BsYXlOYW1lOiAnUHJvbXB0IFZlcnNpb24gSUQnLFxuICAgICAgICBuYW1lOiAncHJvbXB0VmVyc2lvbklkJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICBkZWZhdWx0OiAnJyxcbiAgICAgICAgZGlzcGxheU9wdGlvbnM6IHsgc2hvdzogeyBvcGVyYXRpb246IFsncHVzaFNjb3JlcyddIH0gfSxcbiAgICAgICAgZGVzY3JpcHRpb246ICdQcm9tcHQgVmVyc2lvbiBJRCBmcm9tIEdldCBFeHBlcmltZW50YWwgUHJvbXB0JyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGRpc3BsYXlOYW1lOiAnVXNlciBJRCcsXG4gICAgICAgIG5hbWU6ICdwdXNoVXNlcklkJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGRlZmF1bHQ6ICcnLFxuICAgICAgICBkaXNwbGF5T3B0aW9uczogeyBzaG93OiB7IG9wZXJhdGlvbjogWydwdXNoU2NvcmVzJ10gfSB9LFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1VzZXIgaWRlbnRpZmllciAoYXQgbGVhc3Qgb25lIG9mIFVzZXIgSUQgb3IgU2Vzc2lvbiBJRCknLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZGlzcGxheU5hbWU6ICdTZXNzaW9uIElEJyxcbiAgICAgICAgbmFtZTogJ3B1c2hTZXNzaW9uSWQnLFxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgZGVmYXVsdDogJycsXG4gICAgICAgIGRpc3BsYXlPcHRpb25zOiB7IHNob3c6IHsgb3BlcmF0aW9uOiBbJ3B1c2hTY29yZXMnXSB9IH0sXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnU2Vzc2lvbiBpZGVudGlmaWVyIChhdCBsZWFzdCBvbmUgb2YgVXNlciBJRCBvciBTZXNzaW9uIElEKScsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBkaXNwbGF5TmFtZTogJ1Njb3JlcycsXG4gICAgICAgIG5hbWU6ICdzY29yZXMnLFxuICAgICAgICB0eXBlOiAnZml4ZWRDb2xsZWN0aW9uJyxcbiAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgIGRlZmF1bHQ6IHt9LFxuICAgICAgICB0eXBlT3B0aW9uczogeyBtdWx0aXBsZVZhbHVlczogdHJ1ZSB9LFxuICAgICAgICBkaXNwbGF5T3B0aW9uczogeyBzaG93OiB7IG9wZXJhdGlvbjogWydwdXNoU2NvcmVzJ10gfSB9LFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Njb3JlcyB0byBwdXNoJyxcbiAgICAgICAgb3B0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6ICdzY29yZVZhbHVlcycsXG4gICAgICAgICAgICBkaXNwbGF5TmFtZTogJ1Njb3JlJyxcbiAgICAgICAgICAgIHZhbHVlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZGlzcGxheU5hbWU6ICdOYW1lJyxcbiAgICAgICAgICAgICAgICBuYW1lOiAnbmFtZScsXG4gICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogJycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTY29yZSBtZXRyaWMgbmFtZScsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZTogJ1R5cGUnLFxuICAgICAgICAgICAgICAgIG5hbWU6ICd0eXBlJyxcbiAgICAgICAgICAgICAgICB0eXBlOiAnb3B0aW9ucycsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogW1xuICAgICAgICAgICAgICAgICAgeyBuYW1lOiAnSW50ZWdlcicsIHZhbHVlOiAnaW50JyB9LFxuICAgICAgICAgICAgICAgICAgeyBuYW1lOiAnRmxvYXQnLCB2YWx1ZTogJ2Zsb2F0JyB9LFxuICAgICAgICAgICAgICAgICAgeyBuYW1lOiAnQm9vbGVhbicsIHZhbHVlOiAnYm9vbCcgfSxcbiAgICAgICAgICAgICAgICAgIHsgbmFtZTogJ1N0cmluZycsIHZhbHVlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogJ2ludCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUeXBlIG9mIHRoZSBzY29yZSB2YWx1ZScsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZTogJ1ZhbHVlJyxcbiAgICAgICAgICAgICAgICBuYW1lOiAndmFsdWUnLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICcnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2NvcmUgdmFsdWUnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICBdLFxuICB9O1xuXG4gIGFzeW5jIGV4ZWN1dGUodGhpczogSUV4ZWN1dGVGdW5jdGlvbnMpOiBQcm9taXNlPElOb2RlRXhlY3V0aW9uRGF0YVtdW10+IHtcbiAgICBjb25zdCBpdGVtcyA9IHRoaXMuZ2V0SW5wdXREYXRhKCk7XG4gICAgY29uc3QgcmV0dXJuRGF0YTogSU5vZGVFeGVjdXRpb25EYXRhW10gPSBbXTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IG9wZXJhdGlvbiA9IHRoaXMuZ2V0Tm9kZVBhcmFtZXRlcignb3BlcmF0aW9uJywgaSkgYXMgc3RyaW5nO1xuICAgICAgICBsZXQgcmVzdWx0OiBJRGF0YU9iamVjdDtcblxuICAgICAgICBpZiAob3BlcmF0aW9uID09PSAnZ2V0UHJvbXB0Jykge1xuICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IGhhbmRsZUdldFByb21wdCh0aGlzLCBpKTtcbiAgICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICdnZXRFeHBlcmltZW50UHJvbXB0Jykge1xuICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IGhhbmRsZUdldEV4cGVyaW1lbnRQcm9tcHQodGhpcywgaSk7XG4gICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAncHVzaFNjb3JlcycpIHtcbiAgICAgICAgICByZXN1bHQgPSBhd2FpdCBoYW5kbGVQdXNoU2NvcmVzKHRoaXMsIGkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBOb2RlT3BlcmF0aW9uRXJyb3IoXG4gICAgICAgICAgICB0aGlzLmdldE5vZGUoKSxcbiAgICAgICAgICAgIGBVbmtub3duIG9wZXJhdGlvbjogJHtvcGVyYXRpb259YCxcbiAgICAgICAgICAgIHsgaXRlbUluZGV4OiBpIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuRGF0YS5wdXNoKHsganNvbjogcmVzdWx0IH0pO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaWYgKHRoaXMuY29udGludWVPbkZhaWwoKSkge1xuICAgICAgICAgIHJldHVybkRhdGEucHVzaCh7XG4gICAgICAgICAgICBqc29uOiB7IGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSxcbiAgICAgICAgICAgIHBhaXJlZEl0ZW06IHsgaXRlbTogaSB9LFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBbcmV0dXJuRGF0YV07XG4gIH1cbn1cbiJdfQ==