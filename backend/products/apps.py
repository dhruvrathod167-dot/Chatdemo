from django.apps import AppConfig


class ProductsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'products'
    verbose_name = 'Products'

    def ready(self):
        # Import signals to register them
        import products.signals  # noqa: F401
