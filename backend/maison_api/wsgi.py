"""
MAISON Luxury Fashion eCommerce Platform
WSGI Configuration

Exposes the WSGI callable as a module-level variable named ``application``.
This is used by WSGI servers such as Gunicorn and uWSGI.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maison_api.settings')

application = get_wsgi_application()
