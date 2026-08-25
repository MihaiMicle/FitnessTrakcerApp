"""Global food database, split by category.

Each sibling module owns one category and exposes a single list constant.
`DEFAULT_FOODS` concatenates them in the original seed order.
"""

from .beef_and_pork import BEEF_AND_PORK
from .beverages import BEVERAGES
from .bread import BREAD
from .condiments_sauces_and_oils import CONDIMENTS_SAUCES_AND_OILS
from .dairy import DAIRY
from .eggs import EGGS
from .fish_and_seafood import FISH_AND_SEAFOOD
from .fruits_berries_and_melons import FRUITS_BERRIES_AND_MELONS
from .fruits_citrus import FRUITS_CITRUS
from .fruits_tree_and_tropical import FRUITS_TREE_AND_TROPICAL
from .grains_pasta_and_cereals import GRAINS_PASTA_AND_CEREALS
from .legumes_and_plant_proteins import LEGUMES_AND_PLANT_PROTEINS
from .nuts_and_seeds import NUTS_AND_SEEDS
from .pantry_and_sweeteners import PANTRY_AND_SWEETENERS
from .poultry import POULTRY
from .supplements import SUPPLEMENTS
from .vegetables_leafy_and_cruciferous import VEGETABLES_LEAFY_AND_CRUCIFEROUS
from .vegetables_roots_and_tubers import VEGETABLES_ROOTS_AND_TUBERS
from .vegetables_fruiting_and_other import VEGETABLES_FRUITING_AND_OTHER

DEFAULT_FOODS = [
    *BEEF_AND_PORK,
    *BEVERAGES,
    *BREAD,
    *CONDIMENTS_SAUCES_AND_OILS,
    *DAIRY,
    *EGGS,
    *FISH_AND_SEAFOOD,
    *FRUITS_BERRIES_AND_MELONS,
    *FRUITS_CITRUS,
    *FRUITS_TREE_AND_TROPICAL,
    *GRAINS_PASTA_AND_CEREALS,
    *LEGUMES_AND_PLANT_PROTEINS,
    *NUTS_AND_SEEDS,
    *PANTRY_AND_SWEETENERS,
    *POULTRY,
    *SUPPLEMENTS,
    *VEGETABLES_LEAFY_AND_CRUCIFEROUS,
    *VEGETABLES_ROOTS_AND_TUBERS,
    *VEGETABLES_FRUITING_AND_OTHER,
]

__all__ = ["DEFAULT_FOODS"]
