const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface FetchOptions extends RequestInit {
  bodyData?: any;
  isMultipart?: boolean;
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

const apiCache = new Map<string, CacheEntry>();
const CACHE_TTL = 15000; // 15 seconds cache lifetime
const inflightRequests = new Map<string, Promise<any>>();

export const clearApiCache = (): void => {
  apiCache.clear();
  inflightRequests.clear();
};

export const getCachedData = (endpoint: string): any | null => {
  const url = `${BASE_URL}${endpoint}`;
  const token = localStorage.getItem('accessToken');
  const currentAcademicYear = localStorage.getItem('currentAcademicYear');
  const cacheKey = `GET::${url}::${currentAcademicYear || ''}::${token || ''}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

export const apiFetch = async (endpoint: string, options: FetchOptions = {}): Promise<any> => {
  const url = `${BASE_URL}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  
  const headers = new Headers(options.headers || {});
  
  // Attach token
  const token = localStorage.getItem('accessToken');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Attach selected academic year header if present
  const currentAcademicYear = localStorage.getItem('currentAcademicYear');
  if (currentAcademicYear && !headers.has('x-academic-year')) {
    headers.set('x-academic-year', currentAcademicYear);
  }

  // Define cache key incorporating academic year and auth token
  const cacheKey = `${method}::${url}::${currentAcademicYear || ''}::${token || ''}`;

  // If request is GET and cache entry is valid, return it
  if (method === 'GET') {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    const inflight = inflightRequests.get(cacheKey);
    if (inflight) {
      return inflight;
    }
  } else if (['POST', 'PUT', 'DELETE'].includes(method)) {
    // Invalidate full cache on data modification requests
    clearApiCache();
  }

  // Handle body stringification if not multipart (multer handles multipart boundary automatically)
  let body = options.body;
  if (options.bodyData && !options.isMultipart) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.bodyData);
  } else if (options.bodyData && options.isMultipart) {
    body = options.bodyData; // Leave FormData as is
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    body,
  };

  const execute = async () => {
    try {
      let response = await fetch(url, fetchOptions);

      // If token expired, try to refresh
      if (response.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            console.log('🔄 Access token expired. Attempting token refresh...');
            const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: refreshToken }),
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              
              // Save new tokens
              localStorage.setItem('accessToken', refreshData.accessToken);
              localStorage.setItem('refreshToken', refreshData.refreshToken);

              // Retry original request with new token
              headers.set('Authorization', `Bearer ${refreshData.accessToken}`);
              response = await fetch(url, { ...fetchOptions, headers });
            } else {
              // Refresh failed, clear localStorage and redirect
              console.warn('❌ Refresh token expired. Logging out user.');
              localStorage.clear();
              window.location.href = '/student_profile/login';
            }
          } catch (refreshErr) {
            console.error('❌ Token refresh process failed:', refreshErr);
          }
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      if (method === 'GET') {
        apiCache.set(cacheKey, { data, timestamp: Date.now() });
      }

      return data;
    } catch (error: any) {
      console.error(`API Fetch Error [${endpoint}]:`, error);
      throw error;
    } finally {
      if (method === 'GET') {
        inflightRequests.delete(cacheKey);
      }
    }
  };

  if (method === 'GET') {
    const promise = execute();
    inflightRequests.set(cacheKey, promise);
    return promise;
  }

  return execute();
};
