from django.urls import path

from .views import ProductSearchView

app_name = 'search'

urlpatterns = [
    path('', ProductSearchView.as_view(), name='product-search'),
]
