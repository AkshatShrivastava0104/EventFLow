import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  'http://localhost:8080/api/v1';

/*
|--------------------------------------------------------------------------
| API URL HELPERS
|--------------------------------------------------------------------------
*/

export function getApiOrigin(): string {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return window.location.origin;
  }
}

export function resolveMediaUrl(
  mediaUrl?: string | null
): string {
  if (!mediaUrl) {
    return '';
  }

  const trimmedUrl = mediaUrl.trim();

  if (!trimmedUrl) {
    return '';
  }

  // Already an absolute URL.
  if (
    trimmedUrl.startsWith('http://') ||
    trimmedUrl.startsWith('https://') ||
    trimmedUrl.startsWith('blob:') ||
    trimmedUrl.startsWith('data:')
  ) {
    return trimmedUrl;
  }

  /*
   * Legacy backend uploads may still return:
   *
   * /uploads/events/<filename>
   *
   * Frontend runs on localhost:5173 while backend
   * runs on localhost:8080.
   *
   * Therefore relative upload paths must be resolved
   * against the backend origin.
   */
  if (trimmedUrl.startsWith('/')) {
    return `${getApiOrigin()}${trimmedUrl}`;
  }

  return `${getApiOrigin()}/${trimmedUrl}`;
}


/*
|--------------------------------------------------------------------------
| AXIOS INSTANCE
|--------------------------------------------------------------------------
*/

const api = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    'Content-Type': 'application/json',
  },

  timeout: 20_000,
});


const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';


function getAccessToken(): string | null {
  return localStorage.getItem(
    ACCESS_TOKEN_KEY
  );
}


function getRefreshToken(): string | null {
  return localStorage.getItem(
    REFRESH_TOKEN_KEY
  );
}


function setTokens(
  accessToken: string,
  refreshToken?: string
) {
  localStorage.setItem(
    ACCESS_TOKEN_KEY,
    accessToken
  );

  if (refreshToken) {
    localStorage.setItem(
      REFRESH_TOKEN_KEY,
      refreshToken
    );
  }
}


function clearTokens() {
  localStorage.removeItem(
    ACCESS_TOKEN_KEY
  );

  localStorage.removeItem(
    REFRESH_TOKEN_KEY
  );
}


/*
|--------------------------------------------------------------------------
| REQUEST INTERCEPTOR
|--------------------------------------------------------------------------
*/

api.interceptors.request.use(
  (
    config: InternalAxiosRequestConfig
  ) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);


/*
|--------------------------------------------------------------------------
| REFRESH TOKEN HANDLING
|--------------------------------------------------------------------------
*/

let refreshPromise:
  Promise<string | null> | null = null;


async function refreshAccessToken(): Promise<string | null> {
  const refreshToken =
    getRefreshToken();

  if (!refreshToken) {
    clearTokens();
    return null;
  }

  try {
    const response = await axios.post<{
      access_token: string;
      refresh_token?: string;
    }>(
      `${API_BASE_URL}/auth/refresh`,
      {
        refresh_token: refreshToken,
      },
      {
        headers: {
          'Content-Type':
            'application/json',
        },

        timeout: 20_000,
      }
    );

    const newAccessToken =
      response.data.access_token;

    if (!newAccessToken) {
      clearTokens();
      return null;
    }

    setTokens(
      newAccessToken,
      response.data.refresh_token
    );

    return newAccessToken;

  } catch {
    clearTokens();
    return null;
  }
}


/*
|--------------------------------------------------------------------------
| RESPONSE INTERCEPTOR
|--------------------------------------------------------------------------
*/

api.interceptors.response.use(
  (response) => {
    return response;
  },

  async (
    error: AxiosError
  ) => {
    const originalRequest =
      error.config as
      | (
        InternalAxiosRequestConfig
        & {
          _retry?: boolean;
        }
      )
      | undefined;

    const requestUrl =
      originalRequest?.url || '';

    const isAuthEndpoint =
      requestUrl.includes(
        '/auth/login'
      ) ||
      requestUrl.includes(
        '/auth/register'
      ) ||
      requestUrl.includes(
        '/auth/refresh'
      );

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise =
        refreshAccessToken();

      refreshPromise.finally(() => {
        refreshPromise = null;
      });
    }

    const newAccessToken =
      await refreshPromise;

    if (!newAccessToken) {
      clearTokens();

      if (
        window.location.pathname !==
        '/login'
      ) {
        window.location.href =
          '/login';
      }

      return Promise.reject(error);
    }

    originalRequest.headers.Authorization =
      `Bearer ${newAccessToken}`;

    return api(originalRequest);
  }
);


export {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
};


export default api;