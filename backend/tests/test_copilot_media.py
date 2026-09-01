"""
Attachment handling.

Attachments arrive base64 encoded from a browser and are untrusted, so the
validation here is the boundary that keeps a malformed or oversized payload out
of the model call
"""

import asyncio
import base64

from core.copilot import media

TINY_PNG = base64.b64encode(b"\x89PNG\r\n\x1a\nfake").decode()


class TestDecodeAttachment:
    def test_decodes_a_valid_image(self):
        result = media.decode_attachment({"mime_type": "image/png", "data": TINY_PNG})
        assert result is not None
        assert result[1] == "image/png"

    def test_strips_a_data_url_prefix(self):
        # This is the shape FileReader.readAsDataURL hands back, and the client
        # should not have to know to trim it
        result = media.decode_attachment(
            {"mime_type": "image/png", "data": f"data:image/png;base64,{TINY_PNG}"}
        )
        assert result is not None

    def test_rejects_an_unsupported_mime_type(self):
        assert media.decode_attachment({"mime_type": "application/pdf", "data": TINY_PNG}) is None

    def test_rejects_undecodable_base64(self):
        assert media.decode_attachment({"mime_type": "image/png", "data": "!!!!"}) is None

    def test_rejects_an_oversized_payload(self):
        oversized = "A" * (media.MAX_IMAGE_BYTES * 2)
        assert media.decode_attachment({"mime_type": "image/jpeg", "data": oversized}) is None

    def test_rejects_missing_data(self):
        assert media.decode_attachment({"mime_type": "image/png"}) is None

    def test_rejects_a_non_dict(self):
        assert media.decode_attachment("image") is None

    def test_mime_type_is_case_insensitive(self):
        assert media.decode_attachment({"mime_type": "IMAGE/PNG", "data": TINY_PNG}) is not None


class TestDecodeAttachments:
    def test_returns_an_empty_list_for_none(self):
        assert media.decode_attachments(None) == []

    def test_drops_bad_entries_and_keeps_good_ones(self):
        decoded = media.decode_attachments(
            [
                {"mime_type": "image/png", "data": TINY_PNG},
                {"mime_type": "text/plain", "data": TINY_PNG},
            ]
        )
        assert len(decoded) == 1

    def test_caps_the_attachment_count(self):
        many = [{"mime_type": "image/png", "data": TINY_PNG}] * 20
        assert len(media.decode_attachments(many)) == media.MAX_ATTACHMENTS


class _FakeResponse:
    def __init__(self, status_code=200, content=b"jpeg-bytes", content_type="image/jpeg"):
        self.status_code = status_code
        self.content = content
        self.headers = {"content-type": content_type}


class _FakeClient:
    """Stands in for httpx.AsyncClient so no test touches the network"""

    def __init__(self, response=None, raises=False):
        self._response = response or _FakeResponse()
        self._raises = raises

    def __call__(self, *args, **kwargs):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, url):
        if self._raises:
            raise RuntimeError("network down")
        return self._response


def _run(coro):
    return asyncio.run(coro)


class TestFetchPhoto:
    def test_returns_bytes_and_mime_type(self, monkeypatch):
        monkeypatch.setattr(media.httpx, "AsyncClient", _FakeClient())
        result = _run(media.fetch_photo("https://storage/a.jpg"))
        assert result == (b"jpeg-bytes", "image/jpeg")

    def test_rejects_a_non_https_url(self, monkeypatch):
        monkeypatch.setattr(media.httpx, "AsyncClient", _FakeClient())
        assert _run(media.fetch_photo("http://storage/a.jpg")) is None

    def test_rejects_an_empty_url(self):
        assert _run(media.fetch_photo("")) is None

    def test_returns_none_on_a_bad_status(self, monkeypatch):
        monkeypatch.setattr(
            media.httpx, "AsyncClient", _FakeClient(_FakeResponse(status_code=404))
        )
        assert _run(media.fetch_photo("https://storage/a.jpg")) is None

    def test_returns_none_when_the_request_raises(self, monkeypatch):
        # A slow storage bucket must not take the whole copilot reply down
        monkeypatch.setattr(media.httpx, "AsyncClient", _FakeClient(raises=True))
        assert _run(media.fetch_photo("https://storage/a.jpg")) is None

    def test_rejects_an_oversized_download(self, monkeypatch):
        big = _FakeResponse(content=b"x" * (media.MAX_IMAGE_BYTES + 1))
        monkeypatch.setattr(media.httpx, "AsyncClient", _FakeClient(big))
        assert _run(media.fetch_photo("https://storage/a.jpg")) is None

    def test_unexpected_content_type_falls_back_to_jpeg(self, monkeypatch):
        odd = _FakeResponse(content_type="application/octet-stream")
        monkeypatch.setattr(media.httpx, "AsyncClient", _FakeClient(odd))
        assert _run(media.fetch_photo("https://storage/a.jpg"))[1] == "image/jpeg"

    def test_fetch_photos_caps_the_list(self, monkeypatch):
        monkeypatch.setattr(media.httpx, "AsyncClient", _FakeClient())
        urls = [f"https://storage/{i}.jpg" for i in range(10)]
        assert len(_run(media.fetch_photos(urls))) == media.MAX_ATTACHMENTS

    def test_fetch_photos_skips_failures(self, monkeypatch):
        monkeypatch.setattr(media.httpx, "AsyncClient", _FakeClient())
        assert _run(media.fetch_photos(["http://insecure/a.jpg"])) == []


class TestWantsBodyFatEstimate:
    def test_detects_a_body_fat_question(self):
        assert media.wants_body_fat_estimate("what's my body fat?")

    def test_detects_a_physique_question(self):
        assert media.wants_body_fat_estimate("How lean do I look right now")

    def test_ignores_an_unrelated_question(self):
        # Fetching four photos to answer this would be pure waste
        assert not media.wants_body_fat_estimate("what should I have for lunch")

    def test_handles_empty_input(self):
        assert not media.wants_body_fat_estimate("")
