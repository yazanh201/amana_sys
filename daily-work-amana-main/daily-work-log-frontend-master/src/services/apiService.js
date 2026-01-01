import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://daily-work-amana-main-417811099802.europe-west1.run.app',
});

// Add request interceptor to include auth token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth service functions
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
};

// Daily logs service functions
export const logService = {
  // Team Leader endpoints
  createLog: (logData) => api.post('/logs', logData),
  updateLog: (id, logData) => api.put(`/logs/${id}`, logData),
  getTeamLeaderLogs: () => api.get('/logs/my-logs'), // ✅ matches your backend
  getLogById: (id) => api.get(`/logs/${id}`),
  deleteLog: (id) => api.delete(`/logs/${id}`),
  submitLog: (id) => api.put(`/logs/${id}/submit`),
  
  // Manager endpoints
  getAllLogs: (filters) => api.get('/logs', { params: filters }),
  approveLog: (id) => api.put(`/logs/${id}/approve`),
  exportLogToPdf: (id) => api.get(`/logs/${id}/export-pdf`, { responseType: 'blob' }),

  
  getTeamLeaders: () => api.get('/logs/team-leaders'),

};

// Project service functions
export const projectService = {
  getAllProjects: () => api.get('/projects'),
  getActiveProjects: () => api.get('/projects/active'),
  getProjectById: (id) => api.get(`/projects/${id}`),
  createProject: (projectData) => api.post('/projects', projectData),
  updateProject: (id, projectData) => api.put(`/projects/${id}`, projectData),
  deleteProject: (id) => api.delete(`/projects/${id}`),
};

// Employee service functions
export const employeeService = {
  getAllEmployees: () => api.get('/employees'),
  getActiveEmployees: () => api.get('/employees/active'),
  getEmployeeById: (id) => api.get(`/employees/${id}`),
  createEmployee: (employeeData) => api.post('/employees', employeeData),
  updateEmployee: (id, employeeData) => api.put(`/employees/${id}`, employeeData),
  deleteEmployee: (id) => api.delete(`/employees/${id}`),
};

// File upload service
export const fileService = {
  uploadPhoto: (logId, formData) => api.post(`/uploads/${logId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadDocument: (logId, formData) => api.post(`/uploads/${logId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteFile: (fileId) => api.delete(`/uploads/files/${fileId}`),
};

// Notification service
export const notificationService = {
  getUserNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export default api;