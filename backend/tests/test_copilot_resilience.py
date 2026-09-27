"""
Gemini retry and fallback.

A busy model must be retried and then routed to the fallback, while a bad
request must fail at once instead of burning the fallback on the same error
"""

import asyncio

import pytest

from core.copilot import resilience


class FakeApiError(Exception):
    def __init__(self, code):
        super().__init__(f"{code} error")
        self.code = code


def run(coro):
    return asyncio.run(coro)


def scripted(outcomes):
    """A fake Gemini call that plays back outcomes and records which model it got"""
    calls = []

    async def call(model):
        calls.append(model)
        outcome = outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    return call, calls


async def no_sleep(_seconds):
    return None


class TestModelChain:
    def test_primary_only_without_fallback(self):
        assert resilience.model_chain("a", None) == ["a"]
        assert resilience.model_chain("a", "  ") == ["a"]

    def test_adds_a_distinct_fallback(self):
        assert resilience.model_chain("a", "b") == ["a", "b"]

    def test_ignores_a_fallback_equal_to_the_primary(self):
        assert resilience.model_chain("a", "a") == ["a"]


class TestIsRetryable:
    def test_busy_codes_are_retryable(self):
        for code in (429, 500, 503, 504):
            assert resilience.is_retryable(FakeApiError(code))

    def test_bad_requests_are_not(self):
        assert not resilience.is_retryable(FakeApiError(400))
        assert not resilience.is_retryable(FakeApiError(403))

    def test_errors_without_a_code_are_not(self):
        assert not resilience.is_retryable(ValueError("boom"))


class TestGenerateWithFallback:
    def test_returns_the_first_success(self):
        call, calls = scripted(["ok"])
        assert run(resilience.generate_with_fallback(call, ["a", "b"], sleep=no_sleep)) == "ok"
        assert calls == ["a"]

    def test_retries_a_busy_primary_before_falling_back(self):
        call, calls = scripted([FakeApiError(503), "ok"])
        assert run(resilience.generate_with_fallback(call, ["a", "b"], sleep=no_sleep)) == "ok"
        assert calls == ["a", "a"]

    def test_moves_to_the_fallback_when_the_primary_stays_busy(self):
        call, calls = scripted([FakeApiError(503), FakeApiError(503), "ok"])
        assert run(resilience.generate_with_fallback(call, ["a", "b"], sleep=no_sleep)) == "ok"
        assert calls == ["a", "a", "b"]

    def test_raises_the_last_busy_error_when_every_model_fails(self):
        call, calls = scripted([FakeApiError(503)] * 3 + [FakeApiError(429)])
        with pytest.raises(FakeApiError) as info:
            run(resilience.generate_with_fallback(call, ["a", "b"], sleep=no_sleep))
        assert info.value.code == 429
        assert calls == ["a", "a", "b", "b"]

    def test_a_bad_request_fails_at_once(self):
        # The fallback would reject the same request
        call, calls = scripted([FakeApiError(400), "never"])
        with pytest.raises(FakeApiError):
            run(resilience.generate_with_fallback(call, ["a", "b"], sleep=no_sleep))
        assert calls == ["a"]

    def test_waits_between_retries_but_not_before_the_fallback(self):
        waits = []

        async def record(seconds):
            waits.append(seconds)

        call, _ = scripted([FakeApiError(503), FakeApiError(503), "ok"])
        run(resilience.generate_with_fallback(call, ["a", "b"], delay=2.0, sleep=record))
        assert waits == [2.0]

    def test_an_empty_model_list_raises(self):
        call, _ = scripted([])
        with pytest.raises(ValueError):
            run(resilience.generate_with_fallback(call, [], sleep=no_sleep))


class TestFriendlyError:
    def test_overloaded_model(self):
        assert "overloaded" in resilience.friendly_error(FakeApiError(503))

    def test_rate_limited(self):
        assert "too many requests" in resilience.friendly_error(FakeApiError(429))

    def test_other_errors_keep_their_detail(self):
        assert "boom" in resilience.friendly_error(ValueError("boom"))
