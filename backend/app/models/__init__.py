"""Collect and expose all model modules so SQLAlchemy mappers are configured
when the package is imported.
"""

# Import all model modules to ensure classes are registered with SQLAlchemy
from . import amc  # noqa: F401
from . import customer  # noqa: F401
from . import invoice  # noqa: F401
from . import product  # noqa: F401
from . import user  # noqa: F401
from . import service_work # noqa: F401
from . import sales # noqa: F401
from . import challan # noqa: F401
from . import notification # noqa: F401

__all__ = [
	"amc",
	"customer",
	"invoice",
	"product",
	"user",
    "service_work",
    "sales",
    "challan",
    "notification",
]
