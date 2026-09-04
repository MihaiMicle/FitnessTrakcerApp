"""Global exercise database, split by body part/category."""

from .chest import CHEST_EXERCISES

DEFAULT_EXERCISES = [
    *CHEST_EXERCISES,
    *BACK_EXERCISES,
]


__all__ = ["DEFAULT_EXERCISES"]
