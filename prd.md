PRD: LaikaTest Community Node for n8n
1. Overview
Product Name

LaikaTest (Community Node for n8n)

One-line Description

An n8n community node that allows automation builders to fetch versioned and experimental prompts from LaikaTest and push evaluation scores back to LaikaTest.

Target Users

AI engineers building automation workflows

Prompt engineers running evaluations

No-code / low-code users using n8n with LLMs

Teams running production and experimental AI workflows

Primary Use Cases

Centralized prompt management inside AI automations

Running prompt experiments (A/B, multi-variant) inside workflows

Sending evaluation feedback back to LaikaTest for learning and analysis

2. Goals & Non-Goals
Goals

Allow read-only access to prompts stored in LaikaTest

Support prompt versioning and experimentation

Enable feedback loops via score pushing

Be safe by default with strong guardrails

Match responses and behavior of the existing LaikaTest client library

Non-Goals

Creating, updating, or deleting prompts

Managing experiments from n8n

Project switching at runtime

Custom retry or rate-limit handling

3. Authentication & Project Model
Authentication

Method: API Key

Source: Generated from laikatest.com

Credential Scope:

1 API key = 1 project

Credentials are configured once at the node level

Constraints

Project cannot be changed dynamically at runtime

All node operations operate within the project tied to the API key

4. Node Structure & Operations
Node Design Choice (Best Practice)

Single node with multiple operations

Reasoning:

Matches n8n convention (e.g., HTTP Request, Notion, Slack nodes)

Keeps credential handling centralized

Reduces cognitive load for users

5. Supported Operations
Operation 1: Get Prompt

Purpose
Fetch a prompt (latest or specific version) from LaikaTest.

Inputs

Prompt Name (string, required)

Version (string or number, optional)

If omitted → latest version is returned

Behavior

Resolves prompt using (project + prompt name)

If version is provided, fetches that specific version

Fails workflow if prompt or version does not exist

Output

Prompt text (with variables preserved)

Prompt type:

system

chat

Any additional metadata returned by the client library

Operation 2: Get Experimental Prompt

Purpose
Fetch an experiment-assigned prompt variant.

Inputs

Prompt Name (string, required)

Experiment ID (string, required)

User ID or Session ID (string, required)

Behavior

Calls getExperimentPrompt via LaikaTest client library

Backend decides:

Which variant to assign

Assignment consistency

Node does not handle randomization logic

Output

Assigned prompt content

Prompt type (system/chat)

Experiment-related metadata returned by client library

Operation 3: Push Scores

Purpose
Send evaluation feedback for experiments back to LaikaTest.

Inputs

Experiment ID (string, required)

Scores (key-value object, required)

Values can be:

float

int

string

Multiple metrics supported in one call

Behavior

Async-safe: scores may arrive late

Uses LaikaTest client library to handle identifiers internally

Fails workflow immediately on error

Output

Raw success response from client library

6. Guardrails & Validation
Strong Guardrails (Required)

Required fields enforced at UI level

Strict typing for scores

No silent fallbacks

Immediate workflow failure on:

Invalid credentials

Missing prompt

Invalid experiment ID

Invalid payload shape

Error Handling

No retries inside node

No rate-limit surfacing

Errors propagated directly to n8n

7. Outputs & Data Contract

Node outputs exactly match the LaikaTest client library responses

No transformation, normalization, or reshaping

Advanced users can rely on stable schemas

8. Technical Notes for Contributors

Mandatory: Read and understand the existing LaikaTest client library

Node logic should:

Map n8n inputs → client library function calls

Pass responses through untouched

No backend logic duplication

Keep node thin and declarative

9. UX Principles

Minimal configuration

Explicit naming (“Prompt Name”, not “ID”)

Clear operation separation

Fail fast > silent success

10. Success Metrics (Implicit)

Community adoption in n8n registry

Usage in AI automation workflows

Low support overhead due to guardrails

Correct experiment attribution and scoring
