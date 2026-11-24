"""OAuth routing checks with mocked Google and database calls."""

from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from src.routes import auth


class AuthRedirectTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(auth.router)
        self.client = TestClient(app, base_url="http://localhost:4000")
        self.addCleanup(self.client.close)

    def test_login_uses_the_local_backend_callback_route(self):
        from starlette.responses import RedirectResponse
        authorize = AsyncMock(return_value=RedirectResponse("https://accounts.google.com/test"))
        with patch.object(auth.google, "authorize_redirect", authorize):
            response = self.client.get("/api/auth/login", follow_redirects=False)
        self.assertEqual(response.status_code, 307)
        callback = authorize.call_args.args[1]
        self.assertEqual(str(callback), "http://localhost:4000/api/auth/callback")

    def callback_location(self, frontend):
        user = SimpleNamespace(email="person@example.com", name="Person", picture=None, role="user")
        database = MagicMock()
        database.query.return_value.filter.return_value.first.return_value = user
        authorize = AsyncMock(return_value={"userinfo": {"email": user.email, "name": user.name}})
        with patch.object(auth, "FRONTEND_URL", frontend), \
             patch.object(auth, "SessionLocal", return_value=database), \
             patch.object(auth, "create_access_token", return_value="test-token"), \
             patch.object(auth.google, "authorize_access_token", authorize):
            response = self.client.get("/api/auth/callback", follow_redirects=False)
        self.assertEqual(response.status_code, 302, response.text)
        database.close.assert_called_once()
        return response.headers["location"]

    def test_local_callback_returns_to_the_local_admin_page(self):
        self.assertEqual(self.callback_location("http://localhost:5173"),
                         "http://localhost:5173/admin?token=test-token")

    def test_production_callback_still_respects_its_configured_frontend(self):
        self.assertEqual(self.callback_location("https://www.aubgolympics.com"),
                         "https://www.aubgolympics.com/admin?token=test-token")
