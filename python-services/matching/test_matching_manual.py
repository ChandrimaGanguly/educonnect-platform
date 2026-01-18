#!/usr/bin/env python3
"""
Manual test of the matching algorithm
"""

from matching_algorithm import get_matcher

# Test data
learner_profile = {
    "user_id": "learner-123",
    "learning_goals": ["mathematics", "physics", "programming"],
    "availability": [
        {"day_of_week": "monday", "start_time": "18:00", "end_time": "20:00"},
        {"day_of_week": "wednesday", "start_time": "18:00", "end_time": "20:00"},
        {"day_of_week": "friday", "start_time": "18:00", "end_time": "20:00"},
    ],
}

mentor_profile_1 = {
    "user_id": "mentor-456",
    "subjects": ["mathematics", "physics"],
    "availability": [
        {"day_of_week": "monday", "start_time": "17:00", "end_time": "21:00"},
        {"day_of_week": "wednesday", "start_time": "17:00", "end_time": "21:00"},
    ],
}

mentor_profile_2 = {
    "user_id": "mentor-789",
    "subjects": ["programming", "web development"],
    "availability": [
        {"day_of_week": "friday", "start_time": "18:00", "end_time": "22:00"},
        {"day_of_week": "saturday", "start_time": "10:00", "end_time": "12:00"},
    ],
}

mentor_profile_3 = {
    "user_id": "mentor-999",
    "subjects": ["mathematics", "physics", "programming"],
    "availability": [
        {"day_of_week": "monday", "start_time": "18:00", "end_time": "20:00"},
        {"day_of_week": "wednesday", "start_time": "18:00", "end_time": "20:00"},
        {"day_of_week": "friday", "start_time": "18:00", "end_time": "20:00"},
    ],
}

print("=" * 80)
print("MATCHING ALGORITHM TEST")
print("=" * 80)

print("\nLearner Profile:")
print(f"  Learning Goals: {learner_profile['learning_goals']}")
print(f"  Availability: {len(learner_profile['availability'])} slots")
for slot in learner_profile["availability"]:
    print(f"    - {slot['day_of_week']}: {slot['start_time']} - {slot['end_time']}")

matcher = get_matcher()

# Test Mentor 1 (Good subject match, good availability)
print("\n" + "-" * 80)
print("MENTOR 1: Good subject + good availability match")
print("-" * 80)
print(f"  Subjects: {mentor_profile_1['subjects']}")
print(f"  Availability: {len(mentor_profile_1['availability'])} slots")
for slot in mentor_profile_1["availability"]:
    print(f"    - {slot['day_of_week']}: {slot['start_time']} - {slot['end_time']}")

score_1 = matcher.calculate_match_score(learner_profile, mentor_profile_1)
print(f"\n  📊 Overall Score: {score_1['overall_score']}/100")
print(f"  📚 Subject Overlap: {score_1['subject_overlap_score']}/100")
print(f"  📅 Availability Overlap: {score_1['availability_overlap_score']}/100")
print("  💡 Reasons:")
for reason in score_1["match_reasons"]:
    print(f"     - {reason}")

# Test Mentor 2 (Some subject match, some availability)
print("\n" + "-" * 80)
print("MENTOR 2: Some subject + limited availability match")
print("-" * 80)
print(f"  Subjects: {mentor_profile_2['subjects']}")
print(f"  Availability: {len(mentor_profile_2['availability'])} slots")
for slot in mentor_profile_2["availability"]:
    print(f"    - {slot['day_of_week']}: {slot['start_time']} - {slot['end_time']}")

score_2 = matcher.calculate_match_score(learner_profile, mentor_profile_2)
print(f"\n  📊 Overall Score: {score_2['overall_score']}/100")
print(f"  📚 Subject Overlap: {score_2['subject_overlap_score']}/100")
print(f"  📅 Availability Overlap: {score_2['availability_overlap_score']}/100")
print("  💡 Reasons:")
for reason in score_2["match_reasons"]:
    print(f"     - {reason}")

# Test Mentor 3 (Perfect match)
print("\n" + "-" * 80)
print("MENTOR 3: Perfect match (all subjects + all availability)")
print("-" * 80)
print(f"  Subjects: {mentor_profile_3['subjects']}")
print(f"  Availability: {len(mentor_profile_3['availability'])} slots")
for slot in mentor_profile_3["availability"]:
    print(f"    - {slot['day_of_week']}: {slot['start_time']} - {slot['end_time']}")

score_3 = matcher.calculate_match_score(learner_profile, mentor_profile_3)
print(f"\n  📊 Overall Score: {score_3['overall_score']}/100")
print(f"  📚 Subject Overlap: {score_3['subject_overlap_score']}/100")
print(f"  📅 Availability Overlap: {score_3['availability_overlap_score']}/100")
print("  💡 Reasons:")
for reason in score_3["match_reasons"]:
    print(f"     - {reason}")

# Ranking
print("\n" + "=" * 80)
print("FINAL RANKING")
print("=" * 80)

mentors = [
    ("Mentor 1", score_1["overall_score"]),
    ("Mentor 2", score_2["overall_score"]),
    ("Mentor 3", score_3["overall_score"]),
]
mentors_sorted = sorted(mentors, key=lambda x: x[1], reverse=True)

for idx, (name, score) in enumerate(mentors_sorted, 1):
    print(f"{idx}. {name}: {score}/100")

print("\n✅ Matching algorithm test completed successfully!")
