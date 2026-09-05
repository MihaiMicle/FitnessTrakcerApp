"""
Tests that the split nutrition router still exposes every endpoint

`routers/nutrition` is a package: each module builds its own APIRouter and
`__init__` stitches them together. A module that fails to register is a
silently missing endpoint rather than an import error, so the route surface
is pinned here the same way `test_social_routes.py` pins the social one
"""

from fastapi import FastAPI

from routers import nutrition

EXPECTED_ROUTES = {
    ("GET", "/logs/{log_date}"),
    ("POST", "/log"),
    ("POST", "/logs"),
    ("POST", "/water"),
    ("GET", "/logs"),
    ("POST", "/logs/{log_date}/toggle-complete"),
    ("POST", "/meals"),
    ("GET", "/meals/{log_date}"),
    ("PUT", "/meals/{meal_id}"),
    ("DELETE", "/meals/{meal_id}"),
}


def _mounted_routes():
    """Read the routes back off a mounted app, the way the server sees them"""
    app = FastAPI()
    app.include_router(nutrition.router)

    routes = set()
    for path, operations in app.openapi()["paths"].items():
        for method in operations:
            routes.add((method.upper(), path))
    return routes


class TestNutritionRoutes:
    def test_every_expected_route_is_mounted(self):
        assert EXPECTED_ROUTES <= _mounted_routes()

    def test_no_unexpected_routes_appear(self):
        assert _mounted_routes() <= EXPECTED_ROUTES

    def test_every_submodule_contributes_routes(self):
        from routers.nutrition import logs, meals

        for module in (logs, meals):
            assert module.router.routes, f"{module.__name__} registered nothing"
