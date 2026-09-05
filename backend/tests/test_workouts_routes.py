"""
Tests that the split workouts router still exposes every endpoint

`routers/workouts` is a package: each module builds its own APIRouter with
the shared prefix and `__init__` stitches them together. Pinned the same way
`test_social_routes.py` pins the social one
"""

from fastapi import FastAPI

from routers import workouts

EXPECTED_ROUTES = {
    ("GET", "/workouts/"),
    ("POST", "/workouts/"),
    ("GET", "/workouts/sessions/{session_id}"),
    ("GET", "/workouts/active"),
    ("PUT", "/workouts/{session_id}"),
    ("DELETE", "/workouts/{session_id}"),
    ("GET", "/workouts/users/{user_id}/sessions"),
    ("GET", "/workouts/exercises"),
    ("POST", "/workouts/exercises"),
    ("GET", "/workouts/exercises/{exercise_name}/last-sets"),
    ("GET", "/workouts/exercises/{exercise_name}/history"),
    ("GET", "/workouts/templates/{template_id}"),
    ("GET", "/workouts/templates"),
    ("POST", "/workouts/templates"),
    ("DELETE", "/workouts/templates/{template_id}"),
    ("PUT", "/workouts/templates/{template_id}"),
    ("GET", "/workouts/users/{user_id}/templates"),
    ("POST", "/workouts/templates/{template_id}/copy"),
}


def _mounted_routes():
    """Read the routes back off a mounted app, the way the server sees them"""
    app = FastAPI()
    app.include_router(workouts.router)

    routes = set()
    for path, operations in app.openapi()["paths"].items():
        for method in operations:
            routes.add((method.upper(), path))
    return routes


class TestWorkoutsRoutes:
    def test_every_expected_route_is_mounted(self):
        assert EXPECTED_ROUTES <= _mounted_routes()

    def test_no_unexpected_routes_appear(self):
        assert _mounted_routes() <= EXPECTED_ROUTES

    def test_every_submodule_contributes_routes(self):
        from routers.workouts import exercises, sessions, templates

        for module in (sessions, exercises, templates):
            assert module.router.routes, f"{module.__name__} registered nothing"

    def test_submodules_share_one_prefix(self):
        """A drifting prefix would mount a working endpoint at the wrong path"""
        from routers.workouts import exercises, sessions, templates

        prefixes = {
            module.router.prefix for module in (sessions, exercises, templates)
        }
        assert prefixes == {"/workouts"}
