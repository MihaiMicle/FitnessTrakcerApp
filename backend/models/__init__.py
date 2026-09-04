# Import every model so cross-file ForeignKey strings like "user_profiles.id" always resolve
from . import feed  # noqa: F401
from . import foods  # noqa: F401
from . import health  # noqa: F401
from . import nutrition  # noqa: F401
from . import profile  # noqa: F401
from . import social  # noqa: F401
from . import workouts  # noqa: F401
