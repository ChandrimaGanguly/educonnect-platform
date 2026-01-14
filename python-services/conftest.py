"""
Pytest configuration and shared fixtures
"""

import asyncio
from typing import AsyncGenerator

import pytest
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from shared.database import Base, get_db

# Test database URL (use a separate test database)
TEST_DATABASE_URL = "postgresql://educonnect:test@localhost:5432/educonnect_test"

# Create test engine
test_engine = create_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_session():
    """Create a fresh database session for each test"""
    # Create tables
    Base.metadata.create_all(bind=test_engine)

    # Create session
    session = TestSessionLocal()

    try:
        yield session
    finally:
        session.close()
        # Drop tables after test
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
async def client(db_session) -> AsyncGenerator:
    """Create a test client for the FastAPI app"""
    from main import app

    # Override database dependency
    async def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def sample_user_data():
    """Sample user data for testing"""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "full_name": "Test User",
    }


@pytest.fixture
def sample_community_data():
    """Sample community data for testing"""
    return {
        "name": "Test Community",
        "slug": "test-community",
        "description": "A test community for unit tests",
        "type": "public",
    }
