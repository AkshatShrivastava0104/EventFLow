import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  'http://localhost:8080/api/v1';


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
|
| Automatically attach access token to every API request.
|
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

    /*
     * IMPORTANT:
     *
     * Use a separate axios request here
     * instead of `api.post()`.
     *
     * This prevents the response interceptor
     * from intercepting the refresh request itself.
     */

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
|
| If an API request returns 401:
|
| 1. Try refresh token
| 2. Save new access token
| 3. Retry original request
|
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


    /*
     * Don't refresh for:
     *
     * /auth/login
     * /auth/register
     * /auth/refresh
     *
     * A 401 from these endpoints is a
     * genuine authentication failure.
     */

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


    /*
     * If multiple requests receive 401
     * simultaneously, only ONE refresh
     * request is sent.
     */

    if (!refreshPromise) {

      refreshPromise =
        refreshAccessToken();

      refreshPromise.finally(() => {
        refreshPromise = null;
      });
    }


    const newAccessToken =
      await refreshPromise;


    /*
     * Refresh failed.
     */

    if (!newAccessToken) {

      clearTokens();

      /*
       * Don't redirect if we're already
       * on the login page.
       */

      if (
        window.location.pathname !==
        '/login'
      ) {

        window.location.href =
          '/login';
      }

      return Promise.reject(error);
    }


    /*
     * Retry original request with
     * fresh access token.
     */

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