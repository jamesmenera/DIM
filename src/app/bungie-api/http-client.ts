import { PlatformErrorCodes, ServerResponse } from 'bungie-api-ts/common';
import { HttpClientConfig, HttpClient } from 'bungie-api-ts/http';

import { stringify } from 'simple-query-string';
import { delay } from 'app/utils/util';
import _ from 'lodash';

/**
 * an error indicating a non-200 response code
 */
export class HttpStatusError extends Error {
  status: number;
  constructor(response: Response) {
    super(response.statusText);
    this.status = response.status;
  }
}

/**
 * an error indicating the Bungie API sent back a parseable response,
 * and that response indicated the request was not successful
 */
export class BungieError<T> extends Error {
  code?: PlatformErrorCodes;
  status?: string;
  endpoint: string;
  constructor(response: Partial<ServerResponse<T>>, request: Request) {
    super(response.Message);
    this.name = 'BungieError';
    this.code = response.ErrorCode;
    this.status = response.ErrorStatus;
    this.endpoint = request.url;
  }
}

/**
 * this is a non-affecting pass-through for successful http requests,
 * but throws JS errors for a non-200 response
 */
function throwHttpError(response: Response) {
  if (response.status < 200 || response.status >= 400) {
    throw new HttpStatusError(response);
  }
  return response;
}
/**
 * sometimes what you have looks like a Response but it's actually an Error
 *
 * this is a non-affecting pass-through for successful API interactions,
 * but throws JS errors for "successful" fetches with Bungie error information
 */
function throwBungieError<T>(serverResponse: ServerResponse<T>, request: Request) {
  const eMessage =
    serverResponse && (serverResponse as any).error && (serverResponse as any).error_description;
  if (eMessage) {
    throw new BungieError(
      {
        Message: eMessage,
        ErrorCode: PlatformErrorCodes.DestinyUnexpectedError,
        ErrorStatus: eMessage,
      },
      request
    );
  }

  if (serverResponse.ErrorCode !== PlatformErrorCodes.Success) {
    throw new BungieError(serverResponse, request);
  }

  return serverResponse;
}

//
// FETCH UTILS
//

/**
 * returns a fetch-like that will abort the request after some time
 *
 * @param fetchFunction use this function to make the request
 * @param timeout abort request after this many milliseconds
 */
export function createFetchWithTimeout(fetchFunction: typeof fetch, timeout: number): typeof fetch {
  return async (...[input, init]: Parameters<typeof fetch>) => {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const signal = controller?.signal;
    let timer: NodeJS.Timeout | undefined = undefined;

    if (controller) {
      timer = setTimeout(() => controller.abort(), timeout);
      if (typeof input === 'string') {
        input = new Request(input);
      }
      init = { ...init, signal };
    }
    try {
      return await fetchFunction(input, init);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  };
}

/**
 * returns a fetch-like that will run a function if the request is taking a long time,
 * e.g. generate a "still waiting!" notification
 *
 * @param fetchFunction use this function to make the request
 * @param timeout run onTimeout after this many milliseconds
 * @param onTimeout the request's startTime and timeout will be passed to this
 */
export function createFetchWithNonStoppingTimeout(
  fetchFunction: typeof fetch,
  timeout: number,
  onTimeout: (startTime: number, timeout: number) => void
): typeof fetch {
  return async (...[input, init]: Parameters<typeof fetch>) => {
    const startTime = Date.now();
    const timer = setTimeout(() => onTimeout(startTime, timeout), timeout);

    try {
      return await fetchFunction(input, init);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  };
}

//
// HTTPCLIENT UTILS
//

export function createHttpClient(
  fetchFunction: typeof fetch,
  apiKey: string,
  withCredentials: boolean
): HttpClient {
  return async (config: HttpClientConfig) => {
    let url = config.url;
    if (config.params) {
      url = `${url}?${stringify(config.params)}`;
    }

    const fetchOptions = new Request(url, {
      method: config.method,
      body: config.body ? JSON.stringify(config.body) : undefined,
      headers: config.body
        ? {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          }
        : {
            'X-API-Key': apiKey,
          },
      credentials: withCredentials ? 'include' : 'omit',
    });
    const response = await fetchFunction(fetchOptions);
    throwHttpError(response);
    const data: ServerResponse<any> = await response.json();
    throwBungieError(data, fetchOptions);
    return data;
  };
}

let timesThrottled = 0;
/**
 * accepts an HttpClient and returns it with added throttling. throttles by increasing amounts
 * as it encounters Bungie API responses that indicate we should back off the requests, and
 * any errors upstream
 *
 * @param httpClient use this client to make the API request
 */
export function throttleHttpClient<T>(httpClient: HttpClient): HttpClient {
  return async (config: HttpClientConfig) => {
    if (timesThrottled > 0) {
      // Double the wait time, starting with 1 second, until we reach 5 minutes.
      const waitTime = Math.min(5 * 60 * 1000, Math.pow(2, timesThrottled) * 500);
      console.log(
        'Throttled',
        timesThrottled,
        'times, waiting',
        waitTime,
        'ms before calling',
        config.url
      );
      await delay(waitTime);
    }

    try {
      const result = await httpClient(config);
      // Quickly heal from being throttled
      timesThrottled = Math.floor(timesThrottled / 2);
      return result;
    } catch (e) {
      switch ((e as BungieError<T>).code) {
        case PlatformErrorCodes.ThrottleLimitExceededMinutes:
        case PlatformErrorCodes.ThrottleLimitExceededMomentarily:
        case PlatformErrorCodes.ThrottleLimitExceededSeconds:
        case PlatformErrorCodes.DestinyThrottledByGameServer:
        case PlatformErrorCodes.PerApplicationThrottleExceeded:
        case PlatformErrorCodes.PerApplicationAnonymousThrottleExceeded:
        case PlatformErrorCodes.PerApplicationAuthenticatedThrottleExceeded:
        case PlatformErrorCodes.PerUserThrottleExceeded:
        case PlatformErrorCodes.SystemDisabled:
          timesThrottled++;
          break;
      }
      throw e;
    }
  };
}