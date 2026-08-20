from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine, Base
from app.api.endpoints import auth, settings as settings_api, files, chat

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup (excellent for zero-config local run)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(settings_api.router, prefix="/api/settings", tags=["Settings"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(chat.router, prefix="/api", tags=["Chat & Conversations"])

@app.get("/healthz")
async def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}
