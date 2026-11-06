import {
  User,
  Message,
  ReflectionSession,
  AnalyticsData,
  CommunicationFeedback,
  HadoopResultsResponse,
  HadoopAggregateSummary,
  HadoopCoupleRecord
} from '../types';

let authToken = localStorage.getItem('betweenus_token') || '';

export interface SavedAccount {
  token: string;
  user: User;
}

export function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem('betweenus_saved_accounts');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAccount(user: User, token: string) {
  try {
    const accounts = getSavedAccounts().filter(a => a.user.id !== user.id && a.user.email.toLowerCase() !== user.email.toLowerCase());
    accounts.unshift({ user, token });
    localStorage.setItem('betweenus_saved_accounts', JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save account:', e);
  }
}

export function removeSavedAccount(userId: string) {
  try {
    const accounts = getSavedAccounts().filter(a => a.user.id !== userId);
    localStorage.setItem('betweenus_saved_accounts', JSON.stringify(accounts));
  } catch {}
}

export function setToken(token: string) {
  authToken = token;
  if (token) {
    localStorage.setItem('betweenus_token', token);
  } else {
    localStorage.removeItem('betweenus_token');
  }
}

export function getToken() {
  return authToken || localStorage.getItem('betweenus_token') || '';
}

async function request(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const activeToken = authToken || localStorage.getItem('betweenus_token') || '';
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  async register(fullName: string, email: string, password: string) {
    const data = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, email, password }),
    });
    if (data.token) {
      setToken(data.token);
      if (data.user) {
        saveAccount(data.user, data.token);
      }
    }
    return data;
  },

  async login(email: string, password: string) {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      setToken(data.token);
      if (data.user) {
        saveAccount(data.user, data.token);
      }
    }
    return data;
  },

  logout() {
    setToken('');
  },

  async getMe() {
    return request('/api/auth/me');
  },

  // Partner Email Connections
  async findPartner(email: string) {
    return request(`/api/partner/find?email=${encodeURIComponent(email)}`);
  },

  async sendPartnerRequest(email: string) {
    return request('/api/partner/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async getPartnerRequests() {
    return request('/api/partner/requests');
  },

  async acceptPartnerRequest(requestId: string) {
    return request(`/api/partner/request/${requestId}/accept`, { method: 'POST' });
  },

  async declinePartnerRequest(requestId: string) {
    return request(`/api/partner/request/${requestId}/decline`, { method: 'POST' });
  },

  async cancelPartnerRequest(requestId: string) {
    return request(`/api/partner/request/${requestId}/cancel`, { method: 'POST' });
  },

  async unlinkPartner() {
    return request('/api/partner/unlink', { method: 'POST' });
  },

  // Messages
  async getMessages() {
    return request('/api/messages');
  },

  async sendMessage(text: string, clientMsgId?: string) {
    return request('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ text, client_msg_id: clientMsgId }),
    });
  },

  async pollMessages(after?: string) {
    const query = after ? `?after=${encodeURIComponent(after)}` : '';
    return request(`/api/messages/poll${query}`);
  },

  async deleteMessage(messageId: string) {
    return request(`/api/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
    });
  },

  // Communication Intelligence
  async reviewMessage(text: string, previousMessage?: string): Promise<{ feedback: CommunicationFeedback }> {
    return request('/api/intelligence/review', {
      method: 'POST',
      body: JSON.stringify({ text, previous_message: previousMessage }),
    });
  },

  async analyzeReply(text: string, messageId?: string): Promise<{ feedback: CommunicationFeedback }> {
    return request('/api/intelligence/analyze-reply', {
      method: 'POST',
      body: JSON.stringify({ text, message_id: messageId }),
    });
  },

  async analyzeMessageEmotion(text: string) {
    return request('/api/intelligence/analyze-message', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async saveMessageAnalysis(data: {
    message_id?: string;
    message_text: string;
    top_emotion: string;
    confidence: number;
    probabilities?: Record<string, number>;
    observation?: string;
  }) {
    return request('/api/intelligence/save-analysis', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getSavedMessageAnalyses() {
    return request('/api/intelligence/saved-analyses');
  },

  // Reflections
  async getReflections(): Promise<{ reflections: ReflectionSession[] }> {
    return request('/api/reflections');
  },

  async createReflection(title?: string) {
    return request('/api/reflections', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  async submitAssessment(
    reflectionId: string,
    ratings: { communication: number; trust: number; support: number; conflict: number; private_notes?: string }
  ) {
    return request(`/api/reflections/${reflectionId}/assess`, {
      method: 'POST',
      body: JSON.stringify(ratings),
    });
  },

  async deleteReflection(reflectionId: string) {
    return request(`/api/reflections/${encodeURIComponent(reflectionId)}`, {
      method: 'DELETE',
    });
  },

  // Analytics
  async getAnalytics(): Promise<AnalyticsData> {
    return request('/api/analytics');
  },

  // Big Data & ML Studio
  async validateBigDataset() {
    return request('/api/bigdata/validate');
  },

  async runMapReduce() {
    return request('/api/bigdata/mapreduce-run', { method: 'POST' });
  },

  async getMlMetrics() {
    return request('/api/ml/metrics');
  },

  async predictDiscrepancy(features: {
    prev_avg_pgs: number;
    prev_comm_gap: number;
    prev_trust_gap: number;
    prev_supp_gap: number;
    prev_conf_gap: number;
    interaction_count: number;
  }) {
    return request('/api/ml/predict', {
      method: 'POST',
      body: JSON.stringify(features),
    });
  },

  // CA3 Verified Baseline
  async getBaselineRelationshipSummary() {
    return request('/api/baseline/relationship-summary');
  },

  async getBaselinePgsByType() {
    return request('/api/baseline/pgs-by-type');
  },

  async getBaselineNlpMetrics() {
    return request('/api/baseline/nlp-metrics');
  },

  async getBaselineStressProbes() {
    return request('/api/baseline/stress-probes');
  },

  async classifyTextEmotion(text: string) {
    return request('/api/baseline/nlp-classify', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async getNlpModelInfo() {
    return request('/api/baseline/nlp-model-info');
  },

  async getStructuredMlStatus() {
    return request('/api/baseline/structured-ml-status');
  },

  // Apache Hadoop MapReduce Results
  async getHadoopResults(params?: {
    page?: number;
    limit?: number;
    search?: string;
    couple_id?: string;
    sort?: 'id_asc' | 'id_desc' | 'pgs_asc' | 'pgs_desc';
  }): Promise<HadoopResultsResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.couple_id) query.set('couple_id', params.couple_id);
    if (params?.sort) query.set('sort', params.sort);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/bigdata/hadoop-results${queryString}`);
  },

  async getHadoopSummary(): Promise<{
    source_file: string;
    is_offline_synthetic_hadoop: boolean;
    disclosure: string;
    summary: HadoopAggregateSummary;
  }> {
    return request('/api/bigdata/hadoop-summary');
  },

  async getHadoopCouple(coupleId: string): Promise<{
    source_file: string;
    is_offline_synthetic_hadoop: boolean;
    disclosure: string;
    couple: HadoopCoupleRecord;
  }> {
    return request(`/api/bigdata/hadoop-couple/${encodeURIComponent(coupleId)}`);
  },

  // Demo Mode
  async setupDemoSession() {
    return request('/api/demo/setup-session', { method: 'POST' });
  },

  async pairDemoUsers(partnerEmail: string) {
    return request('/api/demo/pair-users', {
      method: 'POST',
      body: JSON.stringify({ partnerEmail }),
    });
  },

  async clearDemoChat() {
    return request('/api/demo/clear-chat', { method: 'POST' });
  },
};
