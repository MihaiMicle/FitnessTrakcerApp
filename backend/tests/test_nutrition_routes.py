"""
Pins the request shape of the nutrition routes

A body annotation naming a schema the module never imported does not raise at
import time on Python 3.14, where annotations are evaluated lazily. FastAPI
cannot resolve the name to a model, quietly demotes the parameter to a required
query argument, and the endpoint returns 422 for every well-formed request

That is invisible until someone clicks the button, so the route surface is
asserted here the same way `test_social_routes.py` asserts the social one
"""

from fastapi import FastAPI

from routers import nutrition

TOGGLE_PATH = "/logs/{log_date}/toggle-complete"


def _spec():
    """Read the schema back off a mounted app, the way the server sees it"""
    app = FastAPI()
    app.include_router(nutrition.router)
    return app.openapi()


def test_toggle_complete_is_mounted():
    assert TOGGLE_PATH in _spec()["paths"]


def test_toggle_complete_takes_a_json_body():
    operation = _spec()["paths"][TOGGLE_PATH]["post"]
    assert "requestBody" in operation


def test_toggle_complete_has_no_query_parameters():
    operation = _spec()["paths"][TOGGLE_PATH]["post"]
    locations = {p["in"] for p in operation.get("parameters", [])}
    assert "query" not in locations


def test_every_body_annotation_resolves_to_a_model():
    """A demoted body parameter shows up as a query arg named after the argument"""
    spec = _spec()
    for path, operations in spec["paths"].items():
        for method, operation in operations.items():
            names = {p["name"] for p in operation.get("parameters", []) if p["in"] == "query"}
            assert "payload" not in names, f"{method.upper()} {path} lost its body"
