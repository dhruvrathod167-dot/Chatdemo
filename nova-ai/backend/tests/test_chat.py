import json
import pytest
from httpx import AsyncClient
from unittest.mock import patch
from app.services.ai.base import AIProvider

class MockAIProvider(AIProvider):
    async def generate_stream(self, messages, system_prompt, temperature, max_tokens):
        yield "Hello "
        yield "I am "
        yield "NOVA AI!"

    async def generate_embeddings(self, text):
        return [0.1] * 384

    async def list_models(self):
        return ["mock-llama3"]

@pytest.mark.asyncio
async def test_chat_and_conversations(client: AsyncClient):
    # 1. Register and log in
    await client.post(
        "/api/auth/register",
        json={"email": "chat-user@nova-ai.com", "password": "securepassword"}
    )
    login_resp = await client.post(
        "/api/auth/login",
        json={"email": "chat-user@nova-ai.com", "password": "securepassword"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create conversation
    create_resp = await client.post(
        "/api/conversations",
        json={"title": "Test Chat"},
        headers=headers
    )
    assert create_resp.status_code == 201
    conv = create_resp.json()
    conv_id = conv["id"]
    assert conv["title"] == "Test Chat"

    # 3. List conversations
    list_resp = await client.get("/api/conversations", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # 4. Patch title
    patch_resp = await client.patch(
        f"/api/conversations/{conv_id}",
        json={"title": "Renamed Chat"},
        headers=headers
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["title"] == "Renamed Chat"

    # 5. Send message and test streaming
    # We patch get_ai_provider to return our MockAIProvider
    with patch("app.api.endpoints.chat.get_ai_provider", return_value=MockAIProvider()):
        chat_resp = await client.post(
            "/api/chat",
            json={"conversation_id": conv_id, "content": "Hello NOVA AI!"},
            headers=headers
        )
        assert chat_resp.status_code == 200
        assert "text/event-stream" in chat_resp.headers["content-type"]
        
        # Accumulate SSE lines
        sse_output = []
        async for line in chat_resp.aiter_lines():
            if line.startswith("data: "):
                event_data = json.loads(line[6:])
                sse_output.append(event_data)
        
        assert len(sse_output) >= 3
        # Check first event is thinking status
        assert sse_output[0]["status"] == "thinking"
        
        # Accumulate tokens
        chunks = [x["chunk"] for x in sse_output if "chunk" in x]
        full_text = "".join(chunks)
        assert "NOVA AI" in full_text
        
        # Check last event is done status
        assert sse_output[-1]["status"] == "done"
        assert "message_id" in sse_output[-1]

    # 6. Fetch message history
    history_resp = await client.get(f"/api/conversations/{conv_id}/messages", headers=headers)
    assert history_resp.status_code == 200
    msgs = history_resp.json()
    assert len(msgs) == 2  # 1 user message, 1 assistant message
    assert msgs[0]["sender"] == "user"
    assert msgs[1]["sender"] == "assistant"
    assert msgs[1]["content"] == "Hello I am NOVA AI!"

    # 7. Delete conversation
    del_resp = await client.delete(f"/api/conversations/{conv_id}", headers=headers)
    assert del_resp.status_code == 204
