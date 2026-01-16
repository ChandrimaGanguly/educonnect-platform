"""
Basic Mentorship Matching Algorithm (Phase 1)

Implements a simplified 2-factor scoring system:
- Subject Overlap (60%): Jaccard similarity between learner goals and mentor subjects
- Availability Overlap (40%): Time slot overlap percentage

Future phases will expand to 6-factor weighted algorithm with ML optimization.
"""

from typing import Dict, List, Set


class BasicMatchingAlgorithm:
    """
    Phase 1 simplified matching: 60% subject overlap + 40% availability overlap
    """

    def calculate_match_score(
        self,
        learner_profile: Dict,
        mentor_profile: Dict
    ) -> Dict:
        """
        Calculate compatibility score between learner and mentor

        Args:
            learner_profile: Dict with 'learning_goals' and 'availability'
            mentor_profile: Dict with 'subjects' and 'availability'

        Returns:
            Dict with scores and match reasons
        """
        # Factor 1: Subject Overlap (60%)
        subject_score = self._calculate_subject_overlap(
            learner_profile.get('learning_goals', []),
            mentor_profile.get('subjects', [])
        )

        # Factor 2: Availability Overlap (40%)
        availability_score = self._calculate_availability_overlap(
            learner_profile.get('availability', []),
            mentor_profile.get('availability', [])
        )

        # Weighted total
        overall_score = (subject_score * 0.6) + (availability_score * 0.4)

        # Generate human-readable reasons
        match_reasons = self._generate_reasons(subject_score, availability_score)

        return {
            'overall_score': round(overall_score, 2),
            'subject_overlap_score': round(subject_score, 2),
            'availability_overlap_score': round(availability_score, 2),
            'match_reasons': match_reasons
        }

    def _calculate_subject_overlap(
        self,
        learner_subjects: List[str],
        mentor_subjects: List[str]
    ) -> float:
        """
        Calculate Jaccard similarity for subjects

        Jaccard similarity = |A ∩ B| / |A ∪ B|
        Returns percentage (0-100)
        """
        if not learner_subjects or not mentor_subjects:
            return 0.0

        learner_set: Set[str] = set(learner_subjects)
        mentor_set: Set[str] = set(mentor_subjects)

        intersection = len(learner_set & mentor_set)
        union = len(learner_set | mentor_set)

        if union == 0:
            return 0.0

        return (intersection / union) * 100

    def _calculate_availability_overlap(
        self,
        learner_availability: List[Dict],
        mentor_availability: List[Dict]
    ) -> float:
        """
        Calculate time slot overlap percentage

        Simplified approach: Count overlapping day-of-week entries
        Returns percentage of learner's availability that mentor can cover

        Future enhancement: Parse actual time ranges for more precise matching
        """
        if not learner_availability:
            return 0.0

        if not mentor_availability:
            return 0.0

        # Extract days of week from availability slots
        learner_days: Set[str] = {
            slot.get('day_of_week', '').lower()
            for slot in learner_availability
            if slot.get('day_of_week')
        }

        mentor_days: Set[str] = {
            slot.get('day_of_week', '').lower()
            for slot in mentor_availability
            if slot.get('day_of_week')
        }

        if not learner_days:
            return 0.0

        # Calculate overlap as percentage of learner's availability covered
        overlap = len(learner_days & mentor_days)
        return (overlap / len(learner_days)) * 100

    def _generate_reasons(
        self,
        subject_score: float,
        availability_score: float
    ) -> List[str]:
        """
        Generate human-readable match reasons based on scores
        """
        reasons = []

        # Subject overlap reasons
        if subject_score >= 80:
            reasons.append("Excellent subject expertise match")
        elif subject_score >= 60:
            reasons.append("Strong subject overlap")
        elif subject_score >= 40:
            reasons.append("Moderate subject alignment")
        elif subject_score >= 20:
            reasons.append("Some subject overlap")
        else:
            reasons.append("Limited subject overlap")

        # Availability reasons
        if availability_score >= 80:
            reasons.append("Highly compatible schedules")
        elif availability_score >= 60:
            reasons.append("Good schedule alignment")
        elif availability_score >= 40:
            reasons.append("Moderate schedule overlap")
        elif availability_score >= 20:
            reasons.append("Some schedule compatibility")
        else:
            reasons.append("Limited schedule overlap")

        return reasons


# Singleton instance
_matcher = BasicMatchingAlgorithm()


def get_matcher() -> BasicMatchingAlgorithm:
    """Get the singleton matcher instance"""
    return _matcher
