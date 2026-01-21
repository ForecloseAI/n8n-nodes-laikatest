# n8n-nodes-laikatest

This is an n8n community node for [LaikaTest](https://laikatest.com) - a prompt management and A/B testing platform for LLM applications.

## Features

- **Get Prompt**: Fetch versioned prompts by name
- **Get Experimental Prompt**: Fetch A/B tested prompt variants with automatic bucketing
- **Push Scores**: Send evaluation metrics back to LaikaTest for experiment analysis

## Installation

### Community Nodes (Recommended)

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-laikatest`
4. Agree to the risks and select **Install**

### Manual Installation

```bash
npm install n8n-nodes-laikatest
```

## Credentials

To use this node, you need a LaikaTest API key:

1. Sign up at [laikatest.com](https://laikatest.com)
2. Navigate to your project settings
3. Copy your API key
4. In n8n, create new credentials of type "LaikaTest API"
5. Paste your API key

## Operations

### Get Prompt

Fetch a prompt template by name.

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| Prompt Name | Yes | Name of the prompt template |
| Version ID | No | Specific version (e.g., "10" or "v10") |
| Variables | No | Key-value pairs to inject into `{{placeholder}}` syntax |

**Output:**
```json
{
  "content": "Your prompt content here",
  "type": "text",
  "promptVersionId": "pv-123"
}
```

**Variable Compilation:**
If your prompt contains placeholders like `{{name}}`, add variables to replace them:
```
Variables:
  Key: name     Value: John
  Key: company  Value: Acme
```
The output will have placeholders replaced with the provided values.

### Get Experimental Prompt

Fetch an A/B tested prompt variant. Users are automatically bucketed for consistent experiences.

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| Experiment Title | Yes | Title of the experiment |
| User ID | No* | User identifier for consistent bucketing |
| Session ID | No* | Session identifier for consistent bucketing |
| Additional Context | No | Extra key-value pairs for bucketing |
| Variables | No | Key-value pairs to inject into `{{placeholder}}` syntax |

*At least one of User ID or Session ID is recommended for consistent bucketing.

**Output:**
```json
{
  "content": "Variant A prompt content",
  "type": "chat",
  "experimentId": "exp-123",
  "bucketId": "bucket-A",
  "promptVersionId": "pv-456",
  "promptId": "prompt-789"
}
```

**Variable Compilation:**
Works the same as Get Prompt - add variables to replace `{{placeholder}}` syntax in the returned content.

### Push Scores

Send evaluation metrics for experiment analysis.

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| Experiment ID | Yes | From Get Experimental Prompt output |
| Bucket ID | Yes | From Get Experimental Prompt output |
| Prompt Version ID | Yes | From Get Experimental Prompt output |
| User ID | No* | User identifier |
| Session ID | No* | Session identifier |
| Scores | Yes | Array of score metrics |

*At least one of User ID or Session ID is required.

**Score Types:**
- `int` - Integer values (e.g., rating: 5)
- `float` - Decimal values (e.g., accuracy: 0.95)
- `bool` - Boolean values (e.g., helpful: true)
- `string` - Text values (e.g., feedback: "Great!")

**Output:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {}
}
```

## Example Workflow

1. **Get Experimental Prompt** - Fetch a prompt variant for user
2. Use the prompt content with your LLM
3. **Push Scores** - Send metrics using the experiment metadata from step 1

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

## License

MIT
