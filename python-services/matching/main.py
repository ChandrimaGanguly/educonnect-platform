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
from matching_algorithm import get_matcher  # noqa: E402

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


class ScoreRequest(BaseModel):
    learner_profile: Dict
    mentor_profile: Dict


class ScoreResponse(BaseModel):
    overall_score: float
    subject_overlap_score: float
    availability_overlap_score: float
    match_reasons: List[str]


@app.post("/match/score", response_model=ScoreResponse)
async def score_match(request: ScoreRequest) -> ScoreResponse:
    """
    Calculate compatibility score between a learner and mentor

    Expects learner_profile and mentor_profile with:
    - learning_goals / subjects: List of subject names
    - availability: List of dicts with day_of_week, start_time, end_time
    """
    matcher = get_matcher()

    score_data = matcher.calculate_match_score(
        request.learner_profile,
        request.mentor_profile
    )

    return ScoreResponse(**score_data)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.host, port=settings.port)
