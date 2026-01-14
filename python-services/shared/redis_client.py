"""Redis client for Python microservices"""

from typing import Optional

import redis.asyncio as aioredis

from .config import settings

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Get Redis client instance"""
    global _redis_client

    if _redis_client is None:
        _redis_client = await aioredis.from_url(
            settings.redis_url,
            password=settings.redis_password,
            encoding="utf-8",
            decode_responses=True,
        )

    return _redis_client


async def close_redis():
    """Close Redis connection"""
    global _redis_client

    if _redis_client:
        await _redis_client.close()
        _redis_client = None


async def redis_health_check() -> bool:
    """Check if Redis is accessible"""
    try:
        client = await get_redis()
        await client.ping()
        return True
    except Exception as e:
        print(f"Redis health check failed: {e}")
        return False
