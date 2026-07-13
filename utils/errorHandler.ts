
import { toast } from 'sonner';

export enum ErrorCategory {
  NETWORK = 'Network Error',
  API = 'API Error',
  DATABASE = 'Database Error',
  AUTH = 'Authentication Error',
  VALIDATION = 'Validation Error',
  UNKNOWN = 'System Error'
}

export interface AppError {
  message: string;
  category: ErrorCategory;
  details?: any;
  retryable?: boolean;
}

export const parseError = (error: any): AppError => {
  const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
  const message = error.message || error.error?.message || (typeof error === 'string' ? error : errorString);
  const status = error.status || error.code || error.error?.code || error.error?.status;

  // Gemini API Specific Errors
  if (message.includes('429') || message.includes('Too Many Requests') || status === 429) {
    return {
      message: 'The neural network is currently at capacity. Please wait a moment before trying again.',
      category: ErrorCategory.API,
      retryable: true
    };
  }

  if (message.includes('503') || message.includes('Service Unavailable') || status === 503) {
    return {
      message: 'The AI service is temporarily unavailable. We are attempting to reconnect.',
      category: ErrorCategory.API,
      retryable: true
    };
  }

  // Auth Cancellation Errors
  if (message.includes('auth/cancelled-popup-request') || message.includes('auth/popup-closed-by-user') || status === 'auth/cancelled-popup-request' || status === 'auth/popup-closed-by-user') {
    return {
      message: 'Login was cancelled.',
      category: ErrorCategory.AUTH,
      retryable: false
    };
  }

  if (message.includes('403') || message.includes('PERMISSION_DENIED') || status === 403) {
    return {
      message: 'Access denied. Please check your system permissions or API configuration.',
      category: ErrorCategory.AUTH,
      retryable: false
    };
  }

  if (message.includes('SAFETY') || message.includes('blocked') || message.includes('finishReason: SAFETY')) {
    return {
      message: 'The request was filtered by safety protocols. Please rephrase your query.',
      category: ErrorCategory.VALIDATION,
      retryable: false
    };
  }

  if (message.includes('Quota exceeded') || message.includes('quota')) {
    return {
      message: 'System quota exceeded. Please check your plan limits.',
      category: ErrorCategory.API,
      retryable: false
    };
  }

  if (message.includes('QuotaExceededError') || message.includes('NS_ERROR_DOM_QUOTA_REACHED')) {
    return {
      message: 'Local storage matrix is full. Please clear some space or upgrade your plan.',
      category: ErrorCategory.DATABASE,
      retryable: false
    };
  }

  if (message.includes('Rpc failed') || message.includes('ProxyUnaryCall')) {
    return {
      message: 'Neural link proxy failure. This is often caused by network restrictions or temporary service interruptions. Please try again in a few seconds.',
      category: ErrorCategory.NETWORK,
      retryable: true
    };
  }

  if (message.includes('status code: 0') || errorString.includes('status code: 0')) {
    return {
      message: 'Network connection failed or API key is invalid. This can also be caused by browser extensions (like ad-blockers) or network firewalls blocking the AI service. Please check your connection and try disabling extensions.',
      category: ErrorCategory.NETWORK,
      retryable: true
    };
  }

  // Network Errors
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || !navigator.onLine) {
    return {
      message: 'Neural link interrupted. Please check your internet connection.',
      category: ErrorCategory.NETWORK,
      retryable: true
    };
  }

  // Database Errors
  if (message.includes('IndexedDB') || message.includes('database') || message.includes('IDB')) {
    return {
      message: 'Local data matrix error. Attempting to recover...',
      category: ErrorCategory.DATABASE,
      retryable: true
    };
  }

  return {
    message: message || 'An unexpected system anomaly occurred.',
    category: ErrorCategory.UNKNOWN,
    details: error,
    retryable: true
  };
};

export const handleError = (error: any, silent: boolean = false) => {
  const appError = parseError(error);
  
  // Don't show toasts or log errors for user cancellations
  const isCancellation = appError.message === 'Login was cancelled.';
  
  if (!silent && !isCancellation) {
    toast.error(appError.category, {
      description: appError.message,
      duration: 5000,
      action: appError.retryable ? {
        label: 'Retry',
        onClick: () => window.location.reload()
      } : undefined
    });
  }

  if (!isCancellation) {
    console.error(`[${appError.category}]`, appError.message, appError.details || '');
  }
  return appError;
};
