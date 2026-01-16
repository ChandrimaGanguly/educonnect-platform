#!/usr/bin/env python3
"""
Standalone test server for matching algorithm
No database dependencies required
"""

from typing import Dict, List
from fastapi import FastAPI
from pydantic import BaseModel
from matching_algorithm import get_matcher

app = FastAPI(
    title="Matching Service Test Server",
    description="Standalone matching algorithm test server",
    version="0.1.0",
)

# Request/Response Models
class ScoreRequest(BaseModel):
    learner_profile: Dict
    mentor_profile: Dict


class ScoreResponse(BaseModel):
    overall_score: float
    subject_overlap_score: float
    availability_overlap_score: float
    match_reasons: List[str]


@app.get("/")
async def root() -> Dict[str, str]:
    return {
        "service": "Matching Service Test Server",
        "version": "0.1.0",
        "status": "operational",
    }


@app.get("/health")
async def health() -> Dict[str, str]:
    return {
        "status": "ok",
        "service": "matching-test",
    }


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
    print("Starting Matching Test Server on http://localhost:8001")
    print("No database dependencies required")
    uvicorn.run(app, host="0.0.0.0", port=8001)
