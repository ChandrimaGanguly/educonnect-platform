"""
Matching Service - ML-based mentor-learner matching

This service handles:
- Compatibility scoring between learners and mentors
- Availability matching
- Match quality optimization
"""

import os
import sys
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Add parent directory to path for shared imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from shared.config import settings  # noqa: E402
from shared.database import health_check as db_health  # noqa: E402
from shared.redis_client import redis_health_check  # noqa: E402

# Initialize FastAPI app
app = FastAPI(
    title="EduConnect Matching Service",
    description="ML-based mentor-learner matching service",
    version="0.1.0",
    debug=settings.debug,
)


# Request/Response Models
class MatchRequest(BaseModel):
    learner_id: str
    preferences: Optional[dict] = None
    limit: int = 10


class MatchScore(BaseModel):
    mentor_id: str
    compatibility_score: float
    availability_score: float
    overall_score: float
    reasons: List[str]


class MatchResponse(BaseModel):
    learner_id: str
    matches: List[MatchScore]


# Health endpoints
@app.get("/health")
async def health() -> Dict[str, str]:
    return {
        "status": "ok",
        "service": settings.service_name,
    }


@app.get("/ready")
async def ready() -> Dict[str, bool | str]:
    db_ok = await db_health()
    redis_ok = await redis_health_check()

    if not db_ok or not redis_ok:
        raise HTTPException(status_code=503, detail="Service not ready")

    return {
        "status": "ready",
        "database": db_ok,
        "redis": redis_ok,
    }


# API Endpoints
@app.get("/")
async def root() -> Dict[str, str]:
    return {
        "service": "Matching Service",
        "version": "0.1.0",
        "status": "operational",
    }


@app.post("/match", response_model=MatchResponse)
async def find_matches(request: MatchRequest) -> MatchResponse:
    """
    Find compatible mentors for a learner

    TODO: Implement ML-based matching algorithm
    """
    # Placeholder implementation
    return MatchResponse(learner_id=request.learner_id, matches=[])


@app.post("/match/score")
async def score_match(learner_id: str, mentor_id: str) -> Dict[str, str | float]:
    """
    Calculate compatibility score between a learner and mentor

    TODO: Implement scoring algorithm
    """
    return {
        "learner_id": learner_id,
        "mentor_id": mentor_id,
        "compatibility_score": 0.0,
        "availability_score": 0.0,
        "overall_score": 0.0,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.host, port=settings.port)
