/**
 * DESIGNER HOMES APPRAISAL PLATFORM
 * AI Service Layer — Provider-Agnostic LLM Integration
 *
 * Supports: OpenAI, Anthropic Claude, or custom providers
 * Designed as a pluggable service with fallback, logging, and cost controls
 */

// ============================================================================
// AI SERVICE — Provider-Agnostic LLM Integration
// ============================================================================

const AIService = {
  /**
   * Provider configurations
   */
  providers: {
    openai: {
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      defaultModel: 'gpt-4o-mini',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
      authHeader: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
      formatRequest: (messages, model, opts) => ({
        model: model,
        messages: messages,
        temperature: opts.temperature || 0.3,
        max_tokens: opts.maxTokens || 2000
      }),
      parseResponse: (data) => data.choices?.[0]?.message?.content || '',
      parseUsage: (data) => ({
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      })
    },
    anthropic: {
      name: 'Anthropic Claude',
      endpoint: 'https://api.anthropic.com/v1/messages',
      defaultModel: 'claude-sonnet-4-20250514',
      models: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'claude-opus-4-20250514'],
      authHeader: (key) => ({
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      }),
      formatRequest: (messages, model, opts) => {
        const systemMsg = messages.find(m => m.role === 'system');
        const userMsgs = messages.filter(m => m.role !== 'system');
        return {
          model: model,
          system: systemMsg?.content || '',
          messages: userMsgs,
          temperature: opts.temperature || 0.3,
          max_tokens: opts.maxTokens || 2000
        };
      },
      parseResponse: (data) => data.content?.[0]?.text || '',
      parseUsage: (data) => ({
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      })
    }
  },

  /**
   * Get current AI settings from localStorage
   */
  getSettings() {
    const stored = localStorage.getItem('dh_ai_settings');
    if (stored) {
      try { return JSON.parse(stored); }
      catch (e) { /* fall through */ }
    }
    return {
      provider: 'none',
      apiKey: '',
      model: '',
      maxMonthlyTokens: 500000,
      maxRequestTokens: 3000,
      temperature: 0.3,
      enabled: false
    };
  },

  /**
   * Save AI settings
   */
  saveSettings(settings) {
    localStorage.setItem('dh_ai_settings', JSON.stringify(settings));
  },

  /**
   * Check if AI is configured and enabled
   * Supports both proxy mode (no local key needed) and direct mode
   */
  isAvailable() {
    const s = this.getSettings();
    if (!s.enabled || s.provider === 'none') return false;
    // Proxy mode doesn't need a local API key
    if (s.useProxy) return true;
    return !!s.apiKey;
  },

  /**
   * Get monthly usage stats
   */
  getMonthlyUsage() {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const logs = DB.where('comment_gen_logs', l => l.created_at?.startsWith(monthKey) && l.success_flag);
    let totalTokens = 0;
    logs.forEach(l => { totalTokens += (l.total_tokens || 0); });
    return { monthKey, totalTokens, requestCount: logs.length };
  },

  /**
   * Check budget before making a request
   */
  checkBudget() {
    const settings = this.getSettings();
    const usage = this.getMonthlyUsage();
    if (usage.totalTokens >= settings.maxMonthlyTokens) {
      return { allowed: false, reason: `Monthly token limit reached (${usage.totalTokens.toLocaleString()} / ${settings.maxMonthlyTokens.toLocaleString()})` };
    }
    return { allowed: true, remaining: settings.maxMonthlyTokens - usage.totalTokens };
  },

  /**
   * Send a request to the configured AI provider
   * @param {string} systemPrompt — system-level instructions
   * @param {string} userPrompt — the structured input
   * @param {object} opts — { temperature, maxTokens, assignmentId, commentType }
   * @returns {Promise<{text: string, usage: object, provider: string, model: string}>}
   */
  /**
   * Proxy endpoint (Netlify function)
   */
  _proxyUrl: '/.netlify/functions/ai-proxy',

  async generate(systemPrompt, userPrompt, opts = {}) {
    const settings = this.getSettings();
    if (!this.isAvailable()) {
      return { text: null, error: 'AI not configured. Using rule-based generation only.', fallback: true };
    }

    const budget = this.checkBudget();
    if (!budget.allowed) {
      return { text: null, error: budget.reason, fallback: true };
    }

    const provider = this.providers[settings.provider];
    if (!provider) {
      return { text: null, error: `Unknown provider: ${settings.provider}`, fallback: true };
    }

    const model = settings.model || provider.defaultModel;
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const logEntry = {
      assignment_id: opts.assignmentId || '',
      comment_type: opts.commentType || '',
      ai_provider: settings.provider,
      ai_model: model,
      input_payload: userPrompt.substring(0, 500),
      output_text: '',
      success_flag: false,
      total_tokens: 0,
      created_at: new Date().toISOString()
    };

    try {
      let text, usage;

      if (settings.useProxy) {
        // ---- SERVER PROXY MODE ----
        // API key stays on the server — browser never sees it
        const proxyHeaders = { 'Content-Type': 'application/json' };
        if (settings.proxySecret) {
          proxyHeaders['X-Proxy-Auth'] = settings.proxySecret;
        }

        const response = await fetch(this._proxyUrl, {
          method: 'POST',
          headers: proxyHeaders,
          body: JSON.stringify({
            provider: settings.provider,
            model: model,
            messages: messages,
            temperature: opts.temperature || settings.temperature,
            maxTokens: opts.maxTokens || settings.maxRequestTokens
          })
        });

        const data = await response.json();
        if (!response.ok) {
          const errMsg = data.error || `Proxy returned HTTP ${response.status}`;
          logEntry.output_text = `PROXY ERROR: ${errMsg}`;
          DB.add('comment_gen_logs', logEntry);
          return { text: null, error: errMsg, fallback: true };
        }

        text = data.text || '';
        usage = data.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      } else {
        // ---- DIRECT MODE ----
        // API key from localStorage sent directly to provider
        const requestBody = provider.formatRequest(messages, model, {
          temperature: opts.temperature || settings.temperature,
          maxTokens: opts.maxTokens || settings.maxRequestTokens
        });

        const response = await fetch(provider.endpoint, {
          method: 'POST',
          headers: provider.authHeader(settings.apiKey),
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status}`;
          logEntry.output_text = `ERROR: ${errMsg}`;
          DB.add('comment_gen_logs', logEntry);
          return { text: null, error: errMsg, fallback: true };
        }

        const data = await response.json();
        text = provider.parseResponse(data);
        usage = provider.parseUsage(data);
      }

      logEntry.output_text = text.substring(0, 1000);
      logEntry.success_flag = true;
      logEntry.total_tokens = usage.totalTokens;
      logEntry.prompt_tokens = usage.promptTokens;
      logEntry.completion_tokens = usage.completionTokens;
      DB.add('comment_gen_logs', logEntry);

      return { text, usage, provider: settings.provider, model };
    } catch (err) {
      logEntry.output_text = `NETWORK ERROR: ${err.message}`;
      DB.add('comment_gen_logs', logEntry);
      return { text: null, error: err.message, fallback: true };
    }
  },

  /**
   * Build system prompt for comment generation
   */
  getSystemPrompt() {
    return `You are a professional appraisal comment writer supporting a licensed residential appraiser. Your role is to refine structured comment drafts into polished, professional appraisal language.

STYLE REQUIREMENTS:
- Write in a concise, clean, defensible, objective tone
- Use language that is lender-safe, AMC-safe, and reviewer-safe
- Match the style of USPAP-conscious, Fannie Mae/UAD-aligned appraisal writing
- Avoid promotional, biased, or subjective language
- Never invent facts, comps, or analysis results not provided in the input
- Never make final value conclusions or present yourself as determining value
- Convert any promotional MLS language into neutral appraisal language
- Use professional third-person voice ("The appraiser..." or passive constructions)
- Keep paragraphs focused — one topic per paragraph
- Do not add headers, bullet points, or formatting — output clean paragraph text only

COMPLIANCE:
- All output is draft support language for appraiser review
- Never claim to replace appraiser judgment
- Never state conclusions as absolute — use "indicates," "suggests," "supports"
- Include appropriate disclaimers where the structured input flags them

OUTPUT:
Return only the refined comment text. No introductions, no explanations, no metadata.`;
  }
};
