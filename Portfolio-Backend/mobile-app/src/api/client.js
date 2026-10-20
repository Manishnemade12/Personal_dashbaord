import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production Cloud API URL (Vercel)
const CLOUD_API_URL = 'https://personaldashbaord-mobile-app.vercel.app/api';

const getInitialBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port } = window.location;
    if (port === '5000') {
      return `${protocol}//${hostname}:${port}/api`;
    }
  }
  // Default to live 24/7 cloud server for mobile APK and web client
  return CLOUD_API_URL;
};

let API_BASE_URL = getInitialBaseUrl();

// Initialize from AsyncStorage if saved
export const initApiBaseUrl = async () => {
  try {
    const savedUrl = await AsyncStorage.getItem('CUSTOM_API_BASE_URL');
    if (savedUrl && savedUrl.trim()) {
      API_BASE_URL = savedUrl.replace(/\/+$/, '');
      return API_BASE_URL;
    }
  } catch (e) {}
  return API_BASE_URL;
};

// Immediately invoke
initApiBaseUrl();

export const setApiBaseUrl = async (url) => {
  if (!url) return;
  API_BASE_URL = url.replace(/\/+$/, '');
  try {
    await AsyncStorage.setItem('CUSTOM_API_BASE_URL', API_BASE_URL);
  } catch (e) {}
};

export const getApiBaseUrl = () => API_BASE_URL;

const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const timeoutMs = options.timeout || 12000; // 12 seconds timeout to prevent infinite loading

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errJson;
      try {
        errJson = JSON.parse(errorText);
      } catch (e) {}
      throw new Error(errJson?.error || errJson?.message || `Server Error (${response.status})`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Connection timed out (${timeoutMs / 1000}s). Could not connect to ${API_BASE_URL}. Check Wi-Fi or Server URL.`);
    }
    if (error.message && error.message.includes('Network request failed')) {
      throw new Error(`Cannot reach server at ${API_BASE_URL}. Make sure phone & laptop are on same Wi-Fi, or configure Server URL.`);
    }
    console.error(`[API Request Error] ${endpoint}:`, error.message);
    throw error;
  }
};


export const api = {
  // Auth Login (Checks real admin collection in MongoDB)
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  // Cloudinary Direct Image Upload (/api/upload)
  uploadImage: (image, folder = 'portfolio') =>
    request('/upload', {
      method: 'POST',
      body: { image, folder },
    }),

  // Profile (/api/prof)
  getProfile: () => request('/prof'),
  updateProfile: (data) => request('/prof', { method: 'POST', body: data }),

  // Blogs (/api/blogs)
  getBlogs: () => request('/blogs'),
  getBlogById: (id) => request(`/blogs?id=${id}`),
  createBlog: (data) => request('/blogs', { method: 'POST', body: data }),
  updateBlog: (data) => request('/blogs', { method: 'PUT', body: data }),
  deleteBlog: (id) => request(`/blogs?id=${id}`, { method: 'DELETE' }),

  // Projects (/api/projects)
  getProjects: () => request('/projects'),
  getProjectById: (id) => request(`/projects?id=${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: data }),
  updateProject: (data) => request('/projects', { method: 'PUT', body: data }),
  deleteProject: (id) => request(`/projects?id=${id}`, { method: 'DELETE' }),

  // Skills (/api/skills)
  getSkills: () => request('/skills'),
  createSkill: (data) => request('/skills', { method: 'POST', body: data }),
  updateSkill: (data) => request('/skills', { method: 'PUT', body: data }),
  deleteSkill: (id) => request(`/skills?id=${id}`, { method: 'DELETE' }),

  // Gallery Photos (/api/photos)
  getPhotos: () => request('/photos'),
  createPhoto: (data) => request('/photos', { method: 'POST', body: data }),
  deletePhoto: (id) => request(`/photos?id=${id}`, { method: 'DELETE' }),

  // Contacts (/api/contacts)
  getContacts: () => request('/contacts'),

  // Calendars (/api/calendars)
  getCalendars: () => request('/calendars'),
  createCalendar: (data) => request('/calendars', { method: 'POST', body: data }),
  updateCalendar: (id, data) => request(`/calendars/${id}`, { method: 'PUT', body: data }),
  deleteCalendar: (id) => request(`/calendars/${id}`, { method: 'DELETE' }),

  // Calendar Events (/api/calendar-events)
  getEvents: (params = {}) => {
    const query = new URLSearchParams();
    if (params.calendarId) query.append('calendarId', params.calendarId);
    if (params.start) query.append('start', params.start);
    if (params.end) query.append('end', params.end);
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    const qs = query.toString();
    return request(`/calendar-events${qs ? `?${qs}` : ''}`);
  },
  getEventById: (id) => request(`/calendar-events/${id}`),
  createEvent: (data) => request('/calendar-events', { method: 'POST', body: data }),
  updateEvent: (id, data) => request(`/calendar-events/${id}`, { method: 'PUT', body: data }),
  deleteEvent: (id) => request(`/calendar-events/${id}`, { method: 'DELETE' }),
  clearAllEvents: () => request('/calendar-events/clear-all', { method: 'DELETE' }),

  // Reminders (/api/reminders)
  getUpcomingReminders: () => request('/reminders/upcoming'),
  dismissReminder: (id) => request(`/reminders/dismiss/${id}`, { method: 'POST' }),
  getReminderLogs: () => request('/reminders/logs'),

  // Finance & Expense Management (/api/finance)
  getFinanceTransactions: (params = {}) => {
    const query = new URLSearchParams();
    if (params.month) query.append('month', params.month);
    if (params.category) query.append('category', params.category);
    if (params.type) query.append('type', params.type);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return request(`/finance/transactions${qs ? `?${qs}` : ''}`);
  },
  createFinanceTransaction: (data) => request('/finance/transactions', { method: 'POST', body: data }),
  updateFinanceTransaction: (id, data) => request(`/finance/transactions/${id}`, { method: 'PUT', body: data }),
  deleteFinanceTransaction: (id) => request(`/finance/transactions/${id}`, { method: 'DELETE' }),
  getFinanceBudget: (month) => request(`/finance/budget${month ? `?month=${month}` : ''}`),
  saveFinanceBudget: (data) => request('/finance/budget', { method: 'POST', body: data }),
  getFinanceSummary: (month) => request(`/finance/summary${month ? `?month=${month}` : ''}`),
  clearAllFinance: () => request('/finance/clear-all', { method: 'DELETE' }),

  // Investment Management (/api/investments)
  getHoldings: () => request('/investments/holdings'),
  createHolding: (data) => request('/investments/holdings', { method: 'POST', body: data }),
  updateHolding: (id, data) => request(`/investments/holdings/${id}`, { method: 'PUT', body: data }),
  deleteHolding: (id) => request(`/investments/holdings/${id}`, { method: 'DELETE' }),
  executeInvestmentTransaction: (data) => request('/investments/transaction', { method: 'POST', body: data }),
  searchInstruments: (q = '', type = '') => request(`/investments/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`),
  getInstrumentPrice: (symbol, type = 'Equity') => request(`/investments/price?symbol=${encodeURIComponent(symbol)}&type=${encodeURIComponent(type)}`),
  getInvestmentSummary: () => request('/investments/summary'),
  getInvestmentAnalytics: () => request('/investments/analytics'),
  clearAllInvestments: () => request('/investments/clear-all', { method: 'DELETE' }),
  bulkAddHoldings: (data) => request('/investments/holdings/bulk', { method: 'POST', body: data }),
  aiExtractHoldings: (data) => request('/investments/ai-extract', { method: 'POST', body: data }),
  getHoldingTransactions: (holdingId) => request(`/investments/holdings/${holdingId}/transactions`),
  getAllTransactions: (holdingId = '') => request(`/investments/transactions${holdingId ? `?holdingId=${holdingId}` : ''}`),
  getInvestmentInsights: (params = {}) => {
    const query = new URLSearchParams();
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.assetClass) query.append('assetClass', params.assetClass);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return request(`/investments/insights${qs ? `?${qs}` : ''}`);
  },
  getNetWorthHistory: (range = '1M') => request(`/investments/net-worth-history?range=${encodeURIComponent(range)}`),
  capturePortfolioSnapshot: (data = {}) => request('/investments/snapshots/capture', { method: 'POST', body: data }),


  // API Management (/api/apis)
  getApis: (params = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return request(`/apis${qs ? `?${qs}` : ''}`);
  },
  getApiById: (id) => request(`/apis/${id}`),
  createApi: (data) => request('/apis', { method: 'POST', body: data }),
  updateApi: (id, data) => request(`/apis/${id}`, { method: 'PUT', body: data }),
  deleteApi: (id) => request(`/apis/${id}`, { method: 'DELETE' }),

  // API Projects (/api/projectapi)
  getProjectApis: () => request('/projectapi'),
  getProjectApiById: (id) => request(`/projectapi/${id}`),
  createProjectApi: (data) => request('/projectapi', { method: 'POST', body: data }),
  updateProjectApi: (id, data) => request(`/projectapi/${id}`, { method: 'PUT', body: data }),
  deleteProjectApi: (id) => request(`/projectapi/${id}`, { method: 'DELETE' }),
  addProjectApiEndpoint: (id, data) => request(`/projectapi/${id}/apis`, { method: 'POST', body: data }),
  updateProjectApiEndpoint: (id, apiId, data) => request(`/projectapi/${id}/apis/${apiId}`, { method: 'PUT', body: data }),
  deleteProjectApiEndpoint: (id, apiId) => request(`/projectapi/${id}/apis/${apiId}`, { method: 'DELETE' }),

  // Education Details (/api/education)
  getEducation: () => request('/education'),
  saveEducation: (data) => request('/education', { method: 'POST', body: data }),
  updateEducation: (data) => request('/education', { method: 'PUT', body: data }),
  deleteEducationItem: (itemId) => request(`/education/${itemId}`, { method: 'DELETE' }),

  // Social Media Links (/api/sociallinks)
  getSocialLinks: () => request('/sociallinks'),
  saveSocialLinks: (data) => request('/sociallinks', { method: 'POST', body: data }),
  updateSocialLinks: (data) => request('/sociallinks', { method: 'PUT', body: data }),

  // Unified Portfolio Summary (/api/portfolio/summary)
  getPortfolioSummary: () => request('/portfolio/summary'),

  // Grok AI Cold Email & Multi-Conversation Sessions (/api/ai/*)
  generateColdEmail: (data) => request('/ai/cold-email', { method: 'POST', body: data }),
  extractTextFromImage: (data) => request('/ai/ocr', { method: 'POST', body: data }),
  getAiConversations: () => request('/ai/conversations'),
  createAiConversation: (data = {}) => request('/ai/conversations', { method: 'POST', body: data }),
  getAiConversation: (id) => request(`/ai/conversations/${id}`),
  updateAiConversation: (id, data) => request(`/ai/conversations/${id}`, { method: 'PUT', body: data }),
  updateAiConversationResume: (id, data) => request(`/ai/conversations/${id}/resume`, { method: 'PUT', body: data }),
  generateAiColdEmailForConversation: (id, data) => request(`/ai/conversations/${id}/generate`, { method: 'POST', body: data }),
  deleteAiConversation: (id) => request(`/ai/conversations/${id}`, { method: 'DELETE' }),

  // Workout & Diet Management (/api/diet/*)
  ensureDietCalendar: () => request('/diet/ensure-calendar'),
  getDailyDietPlan: (date) => request(`/diet/daily-plan${date ? `?date=${date}` : ''}`),
  toggleMealStatus: (eventId) => request(`/diet/toggle-status/${eventId}`, { method: 'POST' }),
  scheduleDietMeal: (data) => request('/diet/schedule-meal', { method: 'POST', body: data }),
  removeDietMeal: (eventId) => request(`/diet/remove-meal/${eventId}`, { method: 'DELETE' }),
  getDietItems: () => request('/diet/items'),
  createDietItem: (data) => request('/diet/items', { method: 'POST', body: data }),
  updateDietItem: (id, data) => request(`/diet/items/${id}`, { method: 'PUT', body: data }),
  deleteDietItem: (id) => request(`/diet/items/${id}`, { method: 'DELETE' }),
  calculateDietMacros: (data) => request('/diet/calculate-macros', { method: 'POST', body: data }),
};

export default api;



