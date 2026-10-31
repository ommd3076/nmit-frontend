/** Process-local API credentials. Values live only in module memory and are never persisted. */
let apiToken = '';

export function setApiToken(token: string): void {
  apiToken = typeof token === 'string' ? token.trim() : '';
}

export function getApiToken(): string {
  return apiToken;
}

/** Remove the configured bearer value from strings and nested error payloads. */
export function redactApiToken(value: unknown): unknown {
  if (!apiToken) return value;
  if (typeof value === 'string') return value.split(apiToken).join('[redacted]');
  if (Array.isArray(value)) return value.map(redactApiToken);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactApiToken(item)]));
  }
  return value;
}
