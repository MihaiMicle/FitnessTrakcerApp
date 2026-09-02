"""
Tests that the split social router still exposes every endpoint

`routers/social` is a package: each module builds its own APIRouter with the
shared prefix and `__init__` stitches them together. That is easy to get subtly
wrong, because a module that fails to register, or a prefix that drifts, is a
silently missing endpoint rather than an import error. Pinning the route
surface turns either mistake into a failing test
"""

from fastapi import FastAPI

from routers import social

EXPECTED_ROUTES = {
    ("GET", "/social/me/settings"),
    ("PUT", "/social/me/settings"),
    ("GET", "/social/username-available"),
    ("GET", "/social/users/search"),
    ("GET", "/social/users/{username}"),
    ("POST", "/social/follow/{user_id}"),
    ("DELETE", "/social/follow/{user_id}"),
    ("DELETE", "/social/followers/{user_id}"),
    ("GET", "/social/followers"),
    ("GET", "/social/following"),
    ("GET", "/social/requests"),
    ("POST", "/social/requests/{user_id}/accept"),
    ("POST", "/social/requests/{user_id}/reject"),
    ("POST", "/social/block/{user_id}"),
    ("DELETE", "/social/block/{user_id}"),
    ("GET", "/social/blocks"),
    ("GET", "/social/feed"),
    ("POST", "/social/feed/{event_id}/like"),
    ("DELETE", "/social/feed/{event_id}/like"),
    ("GET", "/social/feed/{event_id}/comments"),
    ("POST", "/social/feed/{event_id}/comments"),
    ("DELETE", "/social/feed/comments/{comment_id}"),
}


def _mounted_routes():
    """Read the routes back off a mounted app, the way the server sees them"""
    app = FastAPI()
    app.include_router(social.router)

    routes = set()
    for path, operations in app.openapi()["paths"].items():
        for method in operations:
            routes.add((method.upper(), path))
    return routes


class TestSocialRoutes:
    def test_every_expected_route_is_mounted(self):
        assert EXPECTED_ROUTES <= _mounted_routes()

    def test_no_unexpected_routes_appear(self):
        assert _mounted_routes() <= EXPECTED_ROUTES

    def test_every_submodule_contributes_routes(self):
        from routers.social import (
            blocking,
            discovery,
            feed,
            graph,
            requests,
            settings,
        )

        for module in (settings, discovery, graph, requests, blocking, feed):
            assert module.router.routes, f"{module.__name__} registered nothing"

    def test_submodules_share_one_prefix(self):
        """A drifting prefix would mount a working endpoint at the wrong path"""
        from routers.social import (
            blocking,
            discovery,
            feed,
            graph,
            requests,
            settings,
        )

        prefixes = {
            module.router.prefix
            for module in (settings, discovery, graph, requests, blocking, feed)
        }
        assert prefixes == {"/social"}
