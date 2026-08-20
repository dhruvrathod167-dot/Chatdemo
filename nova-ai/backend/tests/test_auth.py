import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_auth_flow(client: AsyncClient):
    # 1. Register a user
    register_response = await client.post(
        "/api/auth/register",
        json={"email": "test@nova-ai.com", "password": "securepassword"}
    )
    assert register_response.status_code == 201
    data = register_response.json()
    assert data["email"] == "test@nova-ai.com"
    assert "id" in data

    # 2. Prevent duplicate email registration
    dup_response = await client.post(
        "/api/auth/register",
        json={"email": "test@nova-ai.com", "password": "anotherpassword"}
    )
    assert dup_response.status_code == 400

    # 3. Log in user
    login_response = await client.post(
        "/api/auth/login",
        json={"email": "test@nova-ai.com", "password": "securepassword"}
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    # 4. Get active user profile
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    me_response = await client.get("/api/auth/me", headers=headers)
    assert me_response.status_code == 200
    profile = me_response.json()
    assert profile["email"] == "test@nova-ai.com"
