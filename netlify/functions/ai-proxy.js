/**
 * DESIGNER HOMES - AI Proxy
 * Netlify Serverless Function
 *
 * Proxies AI requests to OpenAI or Anthropic so API keys stay server-side.
 * The browser never sees or stores the API key.
 *
 * Environment Variables Required:
 *   OPENAI_API_KEY    - OpenAI API key (sk-...)        [optional]
 *   ANTHROPIC_API_KEY - Anthropic API key (sk-ant-...) [optional]
 *   SITE_URL          - Base URL for CORS (e.g., https://designerhomesre.com)
 *   AI_PROXY_SECRET   - Shared secret to authorize proxy requests [optional but recommended]
 */

exports.handler = async (event) => {
  const siteUrl = process.env.SITE_URL || 'https://designerhomesre.com';

  const headers = {
    'Access-Control-Allow-Origin': siteUrl,
    'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Auth',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Optional: verify proxy auth token (prevents unauthorized use of your keys)
  const proxySecret = process.env.AI_PROXY_SECRET;
  if (proxySecret) {
    const authHeader = event.headers['x-proxy-auth'] || '';
    if (authHeader !== proxySecret) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
  }

  try {
    const body = JSON.parse(event.body);
    const { provider, model, messages, temperature, maxTokens } = body;

    if (!provider || !messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: provider, messages' })
      };
    }

    // ---- Route to the correct provider ----
    let apiUrl, apiHeaders, apiBody;

    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ error: 'OpenAI API key not configured on server. Ask your admin to set OPENAI_API_KEY in Netlify environment variables.' })
        };
      }

      apiUrl = 'https://api.openai.com/v1/chat/completions';
      apiHeaders = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
      apiBody = {
        model: model || 'gpt-4o-mini',
        messages: messages,
        temperature: temperature || 0.3,
        max_tokens: maxTokens || 2000
      };

    } else if (provider === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ error: 'Anthropic API key not configured on server. Ask your admin to set ANTHROPIC_API_KEY in Netlify environment variables.' })
        };
      }

      const systemMsg = messages.find(m => m.role === 'system');
      const userMsgs = messages.filter(m => m.role !== 'system');

      apiUrl = 'https://api.anthropic.com/v1/messages';
      apiHeaders = {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      };
      apiBody = {
        model: model || 'claude-sonnet-4-20250514',
        system: systemMsg?.content || '',
        messages: userMsgs,
        temperature: temperature || 0.3,
        max_tokens: maxTokens || 2000
      };

    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Unsupported provider: ${provider}. Use "openai" or "anthropic".` })
      };
    }

    // ---- Forward request to provider ----
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify(apiBody)
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || `Provider returned HTTP ${response.status}`;
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: errMsg, provider_error: true })
      };
    }

    // ---- Normalize response format ----
    let result;
    if (provider === 'openai') {
      result = {
        text: data.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        model: data.model || model,
        provider: 'openai'
      };
    } else {
      result = {
        text: data.content?.[0]?.text || '',
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        },
        model: data.model || model,
        provider: 'anthropic'
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error('[ai-proxy] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Proxy error: ${err.message}` })
    };
  }
};
