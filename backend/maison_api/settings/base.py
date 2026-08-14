"""
MAISON Luxury Fashion eCommerce Platform
Base Settings Configuration

This module contains all core Django and third-party package settings.
Environment-specific overrides should be handled via environment variables.
"""

import os
import sys
from datetime import timedelta

from decouple import config, Csv

# ------------------------------------------------------------------------------
# Base Directory Configuration
# ------------------------------------------------------------------------------
BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)

# Add the backend root to the Python path so that 'core', 'products', etc.
# are importable as top-level packages.
sys.path.insert(0, os.path.join(BASE_DIR))

# ------------------------------------------------------------------------------
# Core Django Settings
# ------------------------------------------------------------------------------
SECRET_KEY = config(
    'SECRET_KEY',
    default='django-insecure-maison-dev-key-change-in-production-xyz123abc'
)

DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='*',
    cast=Csv()
)

# ------------------------------------------------------------------------------
# Application Definition
# ------------------------------------------------------------------------------
INSTALLED_APPS = [
    # Django built-in apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party packages
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'django_celery_beat',

    # MAISON application modules
    'products',
    'orders',
    'users',
    'cart',
    'search',
    'coupons',
    'payments',
]

# ------------------------------------------------------------------------------
# Middleware Configuration
# ------------------------------------------------------------------------------
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    # Custom MAISON middleware
    'core.middleware.RequestLoggingMiddleware',
    'core.middleware.RateLimitMiddleware',
    'core.middleware.SecurityHeadersMiddleware',
]

# ------------------------------------------------------------------------------
# URL Configuration
# ------------------------------------------------------------------------------
ROOT_URLCONF = 'maison_api.urls'

# ------------------------------------------------------------------------------
# Template Configuration
# ------------------------------------------------------------------------------
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ------------------------------------------------------------------------------
# WSGI / ASGI
# ------------------------------------------------------------------------------
WSGI_APPLICATION = 'maison_api.wsgi.application'
ASGI_APPLICATION = 'maison_api.asgi.application'

# ------------------------------------------------------------------------------
# Authentication Configuration
# ------------------------------------------------------------------------------
AUTH_USER_MODEL = 'users.User'

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

# ------------------------------------------------------------------------------
# Password Validation
# ------------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        },
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# ------------------------------------------------------------------------------
# Internationalization
# ------------------------------------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ------------------------------------------------------------------------------
# Static & Media Files
# ------------------------------------------------------------------------------
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# ------------------------------------------------------------------------------
# Default Primary Key Field Type
# ------------------------------------------------------------------------------
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ==============================================================================
# DATABASE CONFIGURATION
# ==============================================================================
# Uses PostgreSQL. The DATABASE_URL is parsed from the environment.
# Falls back to a local SQLite database for development if PostgreSQL is
# not available.
# ==============================================================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='maison_db'),
        'USER': config('DB_USER', default='maison_user'),
        'PASSWORD': config('DB_PASSWORD', default='maison_password'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
        'CONN_MAX_AGE': config('DB_CONN_MAX_AGE', default=60, cast=int),
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

# ==============================================================================
# CACHING CONFIGURATION
# ==============================================================================
# Uses Redis as the cache backend for session storage, API caching, and
# general-purpose caching.
# ==============================================================================
REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
        'KEY_PREFIX': 'maison_',
        'TIMEOUT': 300,  # 5 minutes default
        'OPTIONS': {
            'socket_connect_timeout': 5,
        },
    },
}

# ==============================================================================
# CELERY CONFIGURATION
# ==============================================================================
# Celery is used for asynchronous tasks such as sending emails, processing
# order confirmations, and updating search indices.
# ==============================================================================
CELERY_BROKER_URL = config(
    'CELERY_BROKER_URL',
    default='redis://localhost:6379/1'
)
CELERY_RESULT_BACKEND = config(
    'CELERY_RESULT_BACKEND',
    default='redis://localhost:6379/2'
)

CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = USE_TZ
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes hard limit
CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60  # 25 minutes soft limit
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

# Celery task routing
CELERY_TASK_ROUTES = {
    'core.utils.send_email_async': {'queue': 'emails'},
    'core.utils.send_order_confirmation_email': {'queue': 'emails'},
    'core.utils.send_welcome_email': {'queue': 'emails'},
    'search.tasks.index_product': {'queue': 'search'},
    'search.tasks.bulk_index_products': {'queue': 'search'},
}

# ==============================================================================
# DJANGO REST FRAMEWORK CONFIGURATION
# ==============================================================================
REST_FRAMEWORK = {
    # Authentication — JWT via SimpleJWT
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],

    # Pagination
    'DEFAULT_PAGINATION_CLASS': 'core.paginators.StandardResultSetPagination',
    'PAGE_SIZE': 20,

    # Default permission classes
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],

    # Filter backends for search, ordering, and filtering
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],

    # Exception handling — use our custom handler for clean error responses
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',

    # Content negotiation
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],

    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],

    # Schema / OpenAPI documentation
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',

    # Versioning
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning',
    'DEFAULT_VERSION': 'v1',
    'ALLOWED_VERSIONS': ['v1'],
}

# ==============================================================================
# SIMPLE JWT CONFIGURATION
# ==============================================================================
# Access tokens are short-lived (60 minutes); refresh tokens last 7 days.
# Token types are included in the payload for middleware discrimination.
# ==============================================================================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),

    'TOKEN_TYPE_CLAIM': 'token_type',

    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    # Custom token claims
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': 'maison-api',
    'JTI_CLAIM': 'jti',

    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=60),
}

# JWT blacklisting app (required when BLACKLIST_AFTER_ROTATION is True)
INSTALLED_APPS.append('rest_framework_simplejwt.token_blacklist')

# ==============================================================================
# CORS CONFIGURATION
# ==============================================================================
# Allow all origins in development. Restrict in production.
# ==============================================================================
CORS_ALLOW_ALL_ORIGINS = config(
    'CORS_ALLOW_ALL_ORIGINS',
    default=True,
    cast=bool
)

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='',
    cast=Csv()
)

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CORS_EXPOSE_HEADERS = [
    'content-length',
    'content-range',
]

# ==============================================================================
# ELASTICSEARCH CONFIGURATION
# ==============================================================================
# Used for full-text product search with fuzzy matching and faceted filtering.
# ==============================================================================
ELASTICSEARCH_DSL = {
    'default': {
        'hosts': config(
            'ELASTICSEARCH_URL',
            default='http://localhost:9200'
        ),
    },
}

ELASTICSEARCH_INDEX_SETTINGS = {
    'number_of_shards': 1,
    'number_of_replicas': 0,
}

# ==============================================================================
# AWS S3 STORAGE CONFIGURATION
# ==============================================================================
# Product images and media are stored in S3 when credentials are available.
# Falls back to local filesystem storage when S3 is not configured.
# ==============================================================================
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='')
AWS_S3_REGION = config('AWS_S3_REGION', default='us-east-1')
AWS_DEFAULT_ACL = 'private'
AWS_S3_FILE_OVERWRITE = False
AWS_QUERYSTRING_AUTH = True
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_S3_ADDRESSING_STYLE = 'virtual'

# Custom domain for S3 (optional)
AWS_S3_CUSTOM_DOMAIN = config('AWS_S3_CUSTOM_DOMAIN', default='')

# Determine whether to use S3 or local filesystem storage
USE_S3_STORAGE = bool(
    AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_STORAGE_BUCKET_NAME
)

if USE_S3_STORAGE:
    # Media files go to S3
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

    # Static files can also be served from S3 in production
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_LOCATION = 'media'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/{AWS_LOCATION}/' if AWS_S3_CUSTOM_DOMAIN else f'https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION}.amazonaws.com/{AWS_LOCATION}/'

    # Ensure django-storages is installed
    INSTALLED_APPS.append('storages')
else:
    # Fallback to local filesystem storage
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# ==============================================================================
# STRIPE PAYMENT CONFIGURATION
# ==============================================================================
STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default='')
STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='')
STRIPE_API_VERSION = '2024-06-20'
STRIPE_CURRENCY = 'usd'

# ==============================================================================
# RAZORPAY PAYMENT CONFIGURATION
# ==============================================================================
RAZORPAY_KEY_ID = config('RAZORPAY_KEY_ID', default='')
RAZORPAY_KEY_SECRET = config('RAZORPAY_KEY_SECRET', default='')

# ==============================================================================
# PAYPAL PAYMENT CONFIGURATION
# ==============================================================================
PAYPAL_CLIENT_ID = config('PAYPAL_CLIENT_ID', default='')
PAYPAL_CLIENT_SECRET = config('PAYPAL_CLIENT_SECRET', default='')
PAYPAL_MODE = config('PAYPAL_MODE', default='sandbox')  # 'sandbox' or 'live'

# Configure PayPal SDK
PAYPAL = {
    'client_id': PAYPAL_CLIENT_ID,
    'client_secret': PAYPAL_CLIENT_SECRET,
    'mode': PAYPAL_MODE,
}

# ==============================================================================
# EMAIL CONFIGURATION
# ==============================================================================
# Supports SMTP, SendGrid, Mailgun, Amazon SES, and other Anymail backends.
# ==============================================================================
EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = config('EMAIL_HOST', default='localhost')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config(
    'DEFAULT_FROM_EMAIL',
    default='MAISON <noreply@maison.com>'
)

# Anymail configuration (for transactional email providers)
ANYMAIL = {
    'MAILGUN_API_KEY': config('MAILGUN_API_KEY', default=''),
    'MAILGUN_SENDER_DOMAIN': config('MAILGUN_SENDER_DOMAIN', default=''),
    'SENDGRID_API_KEY': config('SENDGRID_API_KEY', default=''),
}

# ==============================================================================
# DJANGO FILTERS CONFIGURATION
# ==============================================================================
FILTERS_DEFAULT_LOOKUP_MAPPING = {
    'exact': 'exact',
    'iexact': 'iexact',
    'contains': 'contains',
    'icontains': 'icontains',
    'gt': 'gt',
    'gte': 'gte',
    'lt': 'lt',
    'lte': 'lte',
    'in': 'in',
    'startswith': 'startswith',
    'istartswith': 'istartswith',
    'endswith': 'endswith',
    'iendswith': 'iendswith',
    'isnull': 'isnull',
    'range': 'range',
}

# ==============================================================================
# DRF SPECTACULAR (OpenAPI Schema) CONFIGURATION
# ==============================================================================
SPECTACULAR_SETTINGS = {
    'TITLE': 'MAISON Luxury Fashion API',
    'DESCRIPTION': (
        'API for the MAISON luxury fashion eCommerce platform. '
        'Provides endpoints for product browsing, order management, '
        'user authentication, cart operations, coupon management, '
        'and payment processing via Stripe, Razorpay, and PayPal.'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SCHEMA_PATH_PREFIX': '/api/',
    'COMPONENT_SPLIT_REQUEST': True,
    'POSTPROCESSING_HOOKS': [
        'drf_spectacular.hooks.postprocess_schema_enums',
        'drf_spectacular.contrib.djangorestframework_camel_case.camelize_serializer_fields',
    ],
    'SECURITY': [{
        'bearerAuth': {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
        }
    }],
}

# ==============================================================================
# DJANGO ADMIN CONFIGURATION
# ==============================================================================
ADMIN_SITE_HEADER = 'MAISON Administration'
ADMIN_SITE_TITLE = 'MAISON Admin'
ADMIN_INDEX_TITLE = 'MAISON Dashboard'

# ==============================================================================
# LOGGING CONFIGURATION
# ==============================================================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': (
                '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
            ),
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'simple': {
            'format': '%(levelname)s: %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'maison.log'),
            'maxBytes': 10 * 1024 * 1024,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': config('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': True,
        },
        'maison_api': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'celery': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Ensure logs directory exists
os.makedirs(os.path.join(BASE_DIR, 'logs'), exist_ok=True)

# ==============================================================================
# FRONTEND CONFIGURATION
# ==============================================================================
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# ==============================================================================
# SECURITY CONFIGURATION
# ==============================================================================
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=not DEBUG, cast=bool)
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=not DEBUG, cast=bool)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=not DEBUG, cast=bool)
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=0, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
SESSION_COOKIE_AGE = 14 * 24 * 60 * 60  # 14 days
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
