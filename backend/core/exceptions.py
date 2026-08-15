"""
Custom Exception Handling for MAISON API

Provides a centralized exception handler that formats all API errors
into a consistent JSON structure. Also defines custom APIException
subclasses for common HTTP error scenarios.

Error Response Format:
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable message",
        "details": { ... }  // optional, for field-level errors
    }
}
"""

import logging

from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAcceptable,
    NotFound,
    ParseError,
    PermissionDenied,
    Throttled,
    UnsupportedMediaType,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger('maison_api')


# ============================================================================
# Custom API Exception Classes
# ============================================================================

class NotFoundError(APIException):
    """
    Raised when a requested resource does not exist.
    Maps to HTTP 404 Not Found.
    """
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'The requested resource was not found.'
    default_code = 'not_found'


class BadRequestError(APIException):
    """
    Raised when the request is malformed or contains invalid data.
    Maps to HTTP 400 Bad Request.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'The request could not be understood.'
    default_code = 'bad_request'


class ForbiddenError(APIException):
    """
    Raised when the user does not have permission to perform
    the requested action.
    Maps to HTTP 403 Forbidden.
    """
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to perform this action.'
    default_code = 'forbidden'


class UnauthorizedError(APIException):
    """
    Raised when authentication is required but not provided,
    or when the provided credentials are invalid.
    Maps to HTTP 401 Unauthorized.
    """
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = 'Authentication credentials were not provided.'
    default_code = 'unauthorized'


class PaymentRequiredError(APIException):
    """
    Raised when a payment is required to proceed.
    Maps to HTTP 402 Payment Required.
    """
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = 'Payment is required to complete this action.'
    default_code = 'payment_required'


class ConflictError(APIException):
    """
    Raised when the request conflicts with the current state
    of the target resource (e.g., duplicate email sign-up).
    Maps to HTTP 409 Conflict.
    """
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'The request conflicts with the current state of the resource.'
    default_code = 'conflict'


class TooManyRequestsError(APIException):
    """
    Raised when the user has exceeded the rate limit.
    Maps to HTTP 429 Too Many Requests.
    """
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = 'Too many requests. Please try again later.'
    default_code = 'too_many_requests'


class InternalServerError(APIException):
    """
    Raised when an unexpected server error occurs.
    Maps to HTTP 500 Internal Server Error.
    """
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'An unexpected error occurred. Please try again later.'
    default_code = 'internal_server_error'


# ============================================================================
# Exception Handler Mapping
# ============================================================================

# Maps DRF exception classes to human-readable error codes
_EXCEPTION_CODE_MAP = {
    AuthenticationFailed: 'authentication_failed',
    NotFound: 'not_found',
    PermissionDenied: 'permission_denied',
    ValidationError: 'validation_error',
    ParseError: 'parse_error',
    Throttled: 'throttled',
    NotAcceptable: 'not_acceptable',
    UnsupportedMediaType: 'unsupported_media_type',
}


# ============================================================================
# Custom Exception Handler
# ============================================================================

def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler that formats all exceptions into a
    consistent JSON response structure.

    Standard error response format:
    {
        "error": {
            "code": "error_code",
            "message": "Human-readable description",
            "details": {}  // optional field-level errors
        }
    }

    For validation errors, the `details` field contains a dictionary
    mapping field names to lists of error messages.

    Args:
        exc: The exception instance.
        context: Dictionary with request and view information.

    Returns:
        A Response instance with formatted error data, or None if the
        exception is not handled here.
    """
    # Let DRF handle the exception first to get a standard response
    response = exception_handler(exc, context)

    if response is not None:
        # Determine the error code
        error_code = _resolve_error_code(exc)

        # Build the error payload
        error_data = {
            'code': error_code,
            'message': _resolve_error_message(exc),
        }

        # For validation errors, include field-level details
        if isinstance(exc, ValidationError):
            if isinstance(response.data, dict):
                # Field-level validation errors
                field_errors = {}
                for field, messages in response.data.items():
                    if field == 'non_field_errors':
                        # Non-field errors go into the message
                        if isinstance(messages, list):
                            error_data['message'] = '; '.join(str(m) for m in messages)
                        else:
                            error_data['message'] = str(messages)
                    elif isinstance(messages, list):
                        field_errors[field] = [str(m) for m in messages]
                    else:
                        field_errors[field] = str(messages)

                if field_errors:
                    error_data['details'] = field_errors
            elif isinstance(response.data, list):
                # List-level validation errors (e.g., for bulk operations)
                error_data['details'] = {'items': [str(item) for item in response.data]}
                error_data['message'] = 'One or more items failed validation.'
        else:
            # For non-validation errors, check if there's extra detail
            if hasattr(exc, 'detail') and isinstance(exc.detail, dict):
                error_data['details'] = exc.detail

        # Log the error for monitoring
        _log_exception(exc, context)

        # Override the response data with our formatted structure
        response.data = {'error': error_data}

    return response


def _resolve_error_code(exc):
    """
    Resolve the error code for a given exception.

    Custom APIException subclasses define their own `default_code`.
    For DRF built-in exceptions, we look up the code from the mapping.
    """
    if isinstance(exc, APIException):
        return getattr(exc, 'default_code', 'error')

    for exc_class, code in _EXCEPTION_CODE_MAP.items():
        if isinstance(exc, exc_class):
            return code

    return 'error'


def _resolve_error_message(exc):
    """
    Resolve a human-readable error message for the exception.
    """
    if isinstance(exc, APIException):
        detail = exc.detail
        if isinstance(detail, str):
            return detail
        if isinstance(detail, list):
            return str(detail[0]) if detail else 'An error occurred.'
        if isinstance(detail, dict):
            # Return the first message from the detail dict
            for value in detail.values():
                if isinstance(value, list) and value:
                    return str(value[0])
                if isinstance(value, str):
                    return value
            return 'An error occurred.'

    return str(exc) if str(exc) else 'An unexpected error occurred.'


def _log_exception(exc, context):
    """
    Log the exception with contextual information.

    - 4xx errors are logged at WARNING level.
    - 5xx errors are logged at ERROR level.
    """
    view = context.get('view')
    request = context.get('request')
    status_code = getattr(exc, 'status_code', 500)

    view_name = f'{view.__class__.__module__}.{view.__class__.__name__}' if view else 'unknown_view'
    path = request.path if request else 'unknown_path'
    method = request.method if request else 'unknown_method'

    if status_code >= 500:
        logger.error(
            f'{method} {path} -> {status_code} [{view_name}]: {exc}',
            exc_info=True,
            extra={'status_code': status_code, 'path': path, 'method': method},
        )
    elif status_code >= 400:
        logger.warning(
            f'{method} {path} -> {status_code} [{view_name}]: {exc}',
            extra={'status_code': status_code, 'path': path, 'method': method},
        )
