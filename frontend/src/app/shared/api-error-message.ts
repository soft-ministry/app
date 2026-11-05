import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (error.status === 0) {
    return `${fallback} API-ul nu răspunde.`;
  }
  if (error.status === 403) {
    return 'Nu ai drepturi pentru această operațiune.';
  }

  const response = error.error as { error?: string; details?: string[] } | string | null;
  if (typeof response === 'string' && response.trim()) {
    return `${fallback} ${response}`;
  }
  if (response && typeof response === 'object') {
    if (Array.isArray(response.details) && response.details.length > 0) {
      return `${fallback} ${response.details.join(', ')}`;
    }
    if (response.error) {
      return `${fallback} ${response.error}`;
    }
  }

  return `${fallback} HTTP ${error.status}.`;
}
