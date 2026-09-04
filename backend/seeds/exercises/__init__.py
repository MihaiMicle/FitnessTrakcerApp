"""Global exercise database, split by body part/category."""

from .chest import CHEST_EXERCISES
from .back import BACK_EXERCISES
from .shoulders import SHOULDER_EXERCISES
from .triceps import TRICEPS_EXERCISES
from .biceps import BICEPS_EXERCISES
from .forearms import FOREARM_EXERCISES
from .legs import LEG_EXERCISES
from .core import CORE_EXERCISES
from .cardio import CARDIO_EXERCISES

DEFAULT_EXERCISES = [
    *CHEST_EXERCISES,
    *BACK_EXERCISES,
    *SHOULDER_EXERCISES,
    *TRICEPS_EXERCISES,
    *BICEPS_EXERCISES,
    *FOREARM_EXERCISES,
    *LEG_EXERCISES,
    *CORE_EXERCISES,
    *CARDIO_EXERCISES,
]


__all__ = ["DEFAULT_EXERCISES"]
