from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from users.views import (
    RegisterView,
    UserProfileView,
    UserAddressListCreateView,
    UserAddressDetailView,
    ChangePasswordView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    GoogleOAuthView,
    CustomTokenObtainPairView,
)

app_name = 'users'

urlpatterns = [
    # Registration & Authentication
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # User Profile
    path('auth/profile/', UserProfileView.as_view(), name='profile'),

    # User Addresses
    path('auth/addresses/', UserAddressListCreateView.as_view(), name='address-list-create'),
    path('auth/addresses/<str:pk>/', UserAddressDetailView.as_view(), name='address-detail'),

    # Password Management
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),

    # OAuth
    path('auth/google/', GoogleOAuthView.as_view(), name='google-oauth'),
]