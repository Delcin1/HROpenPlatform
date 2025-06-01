import axios from 'axios';
import { OpenAPI as OpenAPIProfile } from './profile/core/OpenAPI';
import { OpenAPI as OpenAPICompany } from './company/core/OpenAPI';
import { OpenAPI as OpenAPICV } from './cv/core/OpenAPI';
import { OpenAPI as OpenAPIAuth } from './auth/core/OpenAPI';
import { OpenAPI as OpenAPIChat } from './chat/core/OpenAPI';
import { OpenAPI as OpenAPICall } from './call/core/OpenAPI';

const API_URL = 'http://localhost:8080';

// Configure OpenAPI instances
const configureOpenAPI = (openAPI: typeof OpenAPIProfile) => {
  openAPI.BASE = API_URL;
  openAPI.TOKEN = async () => localStorage.getItem('access_token') || '';
  openAPI.WITH_CREDENTIALS = true;
  openAPI.CREDENTIALS = 'include';
};

configureOpenAPI(OpenAPIProfile);
configureOpenAPI(OpenAPICompany);
configureOpenAPI(OpenAPICV);
configureOpenAPI(OpenAPIAuth);
configureOpenAPI(OpenAPIChat);
configureOpenAPI(OpenAPICall);

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Request:', {
      method: config.method,
      url: config.url,
      headers: config.headers,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => {
    console.log('Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers,
    });
    return response;
  },
  async (error) => {
    if (!error.response) {
      console.error('Network error:', error);
      return Promise.reject(error);
    }

    console.error('Response error:', {
      status: error.response.status,
      data: error.response.data,
      headers: error.response.headers,
    });

    const originalRequest = error.config;

    // Only refresh token if it's not a login or refresh request
    if (error.response.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/api/v1/auth/login') && 
        !originalRequest.url?.includes('/api/v1/auth/refresh')) {
      
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Create a new axios instance for refresh to avoid interceptors
        const refreshResponse = await axios.post(`${API_URL}/api/v1/auth/refresh`, null, {
          headers: {
            Authorization: `${refreshToken}`,
          },
        });

        const { access_token, refresh_token } = refreshResponse.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);

        // Retry original request with new access token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
); 