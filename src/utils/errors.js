// Custom error classes for consistent error handling

class AppError extends Error {
  constructor(message, status = 500, code = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.resource = resource;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message, originalError = null) {
    super(
      `${service} service error: ${message}`,
      502,
      'EXTERNAL_SERVICE_ERROR',
    );
    this.service = service;
    this.originalError = originalError;
  }
}

class TimeoutError extends AppError {
  constructor(service, timeout) {
    super(`${service} request timed out after ${timeout}ms`, 504, 'TIMEOUT');
    this.service = service;
    this.timeout = timeout;
  }
}

class WebhookError extends AppError {
  constructor(message, webhookType = null, connectionId = null) {
    super(message, 400, 'WEBHOOK_ERROR');
    this.webhookType = webhookType;
    this.connectionId = connectionId;
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ExternalServiceError,
  TimeoutError,
  WebhookError,
};
