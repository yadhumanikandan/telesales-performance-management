const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) });
  }

  patch<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

// Auth API
export const authApi = {
  signup: (email: string, password: string, fullName: string) =>
    api.post<{ user: any }>('/auth/signup', { email, password, fullName }),
  login: (email: string, password: string) =>
    api.post<{ user: any }>('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get<{ user: any; role: string; teamId: string | null }>('/auth/me'),
  updateProfile: (data: any) => api.patch<{ user: any }>('/auth/profile', data),
};

// Leads API
export const leadsApi = {
  getAll: (status?: string) => api.get<{ leads: any[] }>(`/leads${status ? `?status=${status}` : ''}`),
  getById: (id: string) => api.get<{ lead: any }>(`/leads/${id}`),
  updateStatus: (id: string, status: string) => api.patch<{ lead: any }>(`/leads/${id}/status`, { status }),
  update: (id: string, data: any) => api.patch<{ lead: any }>(`/leads/${id}`, data),
  convert: (contactId: string, tradeLicenseNumber: string) =>
    api.post<{ contact: any }>(`/leads/${contactId}/convert`, { tradeLicenseNumber }),
  getStats: () => api.get<{ stats: any }>('/leads/stats/summary'),
};

// Calls API
export const callsApi = {
  getList: (date?: string) => api.get<{ callList: any[] }>(`/calls/list${date ? `?date=${date}` : ''}`),
  logFeedback: (data: any) => api.post<{ feedback: any }>('/calls/feedback', data),
  skip: (callListId: string) => api.post(`/calls/${callListId}/skip`),
  getStats: (date?: string) => api.get<{ stats: any }>(`/calls/stats${date ? `?date=${date}` : ''}`),
  getActivity: (limit?: number) => api.get<{ activity: any[] }>(`/calls/activity?limit=${limit || 20}`),
};

// Performance API
export const performanceApi = {
  getStats: (period?: string) => api.get<{ stats: any }>(`/performance/stats?period=${period || 'today'}`),
  getHourly: () => api.get<{ hourlyData: any[] }>('/performance/hourly'),
  getWeekly: () => api.get<{ weeklyData: any[] }>('/performance/weekly'),
  getLeaderboard: (period?: string) => api.get<{ leaderboard: any[] }>(`/performance/leaderboard?period=${period || 'today'}`),
  getHeatmap: (period?: string) => api.get<{ heatmapData: any[] }>(`/performance/heatmap?period=${period || 'weekly'}`),
};

// Submissions API
export const submissionsApi = {
  getAll: (period?: string) => api.get<{ submissions: any[] }>(`/submissions?period=${period || 'weekly'}`),
  create: (data: any) => api.post<{ submission: any }>('/submissions', data),
  delete: (id: string) => api.delete(`/submissions/${id}`),
  checkToday: () => api.get<{ isMissingToday: boolean }>('/submissions/check-today'),
};

// Talk Time API
export const talktimeApi = {
  getToday: () => api.get<{ talkTime: any }>('/talktime/today'),
  getRecent: () => api.get<{ entries: any[] }>('/talktime/recent'),
  getMonthly: () => api.get<{ monthlyTotal: number }>('/talktime/monthly'),
  submit: (data: any) => api.post<{ talkTime: any }>('/talktime', data),
};

// Goals API
export const goalsApi = {
  getAll: () => api.get<{ goals: any[] }>('/goals'),
  create: (data: any) => api.post<{ goal: any }>('/goals', data),
  update: (id: string, data: any) => api.patch<{ goal: any }>(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
  getProgress: (id: string) => api.get<{ goal: any; currentValue: number; progress: number }>(`/goals/${id}/progress`),
};

// Teams API
export const teamsApi = {
  getAll: () => api.get<{ teams: any[] }>('/teams'),
  getById: (id: string) => api.get<{ team: any }>(`/teams/${id}`),
  getMembers: (id: string) => api.get<{ members: any[] }>(`/teams/${id}/members`),
  create: (data: any) => api.post<{ team: any }>('/teams', data),
  update: (id: string, data: any) => api.patch<{ team: any }>(`/teams/${id}`, data),
  delete: (id: string) => api.delete(`/teams/${id}`),
  getPerformance: (id: string, period?: string) => api.get<{ stats: any }>(`/teams/${id}/performance?period=${period || 'today'}`),
};
