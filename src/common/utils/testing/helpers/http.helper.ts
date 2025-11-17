import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

/**
 * HTTP test helper for API testing
 * Provides convenient methods for making HTTP requests with authentication
 *
 * @example
 * ```typescript
 * const httpHelper = new HttpTestHelper(app);
 *
 * // Authenticate
 * const token = await httpHelper.authenticate({
 *   email: 'test@example.com',
 *   password: 'password'
 * });
 *
 * // Make authenticated GET request
 * const response = await httpHelper.get('/users/me');
 *
 * // Make POST request
 * const createResponse = await httpHelper.post('/users', { name: 'John' });
 * ```
 */
export class HttpTestHelper {
  private app: INestApplication;
  private authToken?: string;

  constructor(app: INestApplication) {
    this.app = app;
  }

  /**
   * Authenticate and store token
   *
   * @param credentials User credentials
   * @returns Authentication token
   */
  async authenticate(credentials: {
    email: string;
    password: string;
  }): Promise<string> {
    const response = await request(this.app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);

    this.authToken = response.body.token || response.body.accessToken;
    return this.authToken;
  }

  /**
   * Set authentication token manually
   *
   * @param token Authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuth(): void {
    this.authToken = undefined;
  }

  /**
   * Make GET request
   *
   * @param url Request URL
   * @param expectedStatus Expected HTTP status code (default: 200)
   * @returns Supertest response
   */
  async get(url: string, expectedStatus: number = 200) {
    const req = request(this.app.getHttpServer()).get(url);

    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }

    return req.expect(expectedStatus);
  }

  /**
   * Make POST request
   *
   * @param url Request URL
   * @param data Request body data
   * @param expectedStatus Expected HTTP status code (default: 201)
   * @returns Supertest response
   */
  async post(url: string, data: any, expectedStatus: number = 201) {
    const req = request(this.app.getHttpServer())
      .post(url)
      .send(data);

    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }

    return req.expect(expectedStatus);
  }

  /**
   * Make PUT request
   *
   * @param url Request URL
   * @param data Request body data
   * @param expectedStatus Expected HTTP status code (default: 200)
   * @returns Supertest response
   */
  async put(url: string, data: any, expectedStatus: number = 200) {
    const req = request(this.app.getHttpServer())
      .put(url)
      .send(data);

    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }

    return req.expect(expectedStatus);
  }

  /**
   * Make PATCH request
   *
   * @param url Request URL
   * @param data Request body data
   * @param expectedStatus Expected HTTP status code (default: 200)
   * @returns Supertest response
   */
  async patch(url: string, data: any, expectedStatus: number = 200) {
    const req = request(this.app.getHttpServer())
      .patch(url)
      .send(data);

    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }

    return req.expect(expectedStatus);
  }

  /**
   * Make DELETE request
   *
   * @param url Request URL
   * @param expectedStatus Expected HTTP status code (default: 200)
   * @returns Supertest response
   */
  async delete(url: string, expectedStatus: number = 200) {
    const req = request(this.app.getHttpServer()).delete(url);

    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }

    return req.expect(expectedStatus);
  }

  /**
   * Upload file
   *
   * @param url Request URL
   * @param fieldName Form field name
   * @param filePath Path to file
   * @param expectedStatus Expected HTTP status code (default: 201)
   * @returns Supertest response
   */
  async uploadFile(
    url: string,
    fieldName: string,
    filePath: string,
    expectedStatus: number = 201
  ) {
    const req = request(this.app.getHttpServer())
      .post(url)
      .attach(fieldName, filePath);

    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }

    return req.expect(expectedStatus);
  }

  /**
   * Make request with custom headers
   *
   * @param method HTTP method
   * @param url Request URL
   * @param options Request options
   * @returns Supertest response
   */
  async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    options: {
      data?: any;
      headers?: Record<string, string>;
      expectedStatus?: number;
    } = {}
  ) {
    const { data, headers = {}, expectedStatus = 200 } = options;

    let req = request(this.app.getHttpServer())[method.toLowerCase()](url);

    // Set custom headers
    for (const [key, value] of Object.entries(headers)) {
      req = req.set(key, value);
    }

    // Set auth token if available
    if (this.authToken && !headers['Authorization']) {
      req = req.set('Authorization', `Bearer ${this.authToken}`);
    }

    // Add body for POST/PUT/PATCH
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      req = req.send(data);
    }

    return req.expect(expectedStatus);
  }

  /**
   * Get raw supertest instance for advanced usage
   */
  getRequest() {
    return request(this.app.getHttpServer());
  }
}
