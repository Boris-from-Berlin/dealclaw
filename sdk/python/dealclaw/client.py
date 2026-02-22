"""DealClaw HTTP client with automatic error handling and retries."""

import time
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from typing import Optional, Dict, Any

from .exceptions import (
    DealClawError,
    AuthenticationError,
    NotFoundError,
    ValidationError,
    InsufficientBalanceError,
    RateLimitError,
)


class DealClawClient:
    """Low-level HTTP client for the DealClaw API."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.dealclaw.org/v1",
        timeout: int = 30,
        max_retries: int = 3,
    ):
        if not api_key or not api_key.startswith("dealclaw_"):
            raise ValueError("API key must start with 'dealclaw_'")

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries

    def _make_request(
        self,
        method: str,
        path: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Make an HTTP request with retry logic."""
        url = f"{self.base_url}{path}"

        if params:
            query_string = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
            if query_string:
                url += f"?{query_string}"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "DealClaw-Python-SDK/0.2.0",
        }

        body = json.dumps(data).encode("utf-8") if data else None

        for attempt in range(self.max_retries):
            try:
                req = Request(url, data=body, headers=headers, method=method)
                with urlopen(req, timeout=self.timeout) as response:
                    response_data = response.read().decode("utf-8")
                    return json.loads(response_data) if response_data else {}

            except HTTPError as e:
                error_body = e.read().decode("utf-8")
                try:
                    error_data = json.loads(error_body)
                except json.JSONDecodeError:
                    error_data = {"error": error_body}

                error_msg = error_data.get("error", str(e))

                if e.code == 401:
                    raise AuthenticationError(error_msg, status_code=401)
                elif e.code == 404:
                    raise NotFoundError(error_msg, status_code=404)
                elif e.code == 400:
                    if "insufficient" in error_msg.lower() or "balance" in error_msg.lower():
                        raise InsufficientBalanceError(error_msg, status_code=400)
                    raise ValidationError(error_msg, status_code=400, details=error_data.get("details", {}))
                elif e.code == 429:
                    if attempt < self.max_retries - 1:
                        wait = 2 ** attempt
                        time.sleep(wait)
                        continue
                    raise RateLimitError(error_msg, status_code=429)
                elif e.code >= 500:
                    if attempt < self.max_retries - 1:
                        time.sleep(2 ** attempt)
                        continue
                    raise DealClawError(error_msg, status_code=e.code)
                else:
                    raise DealClawError(error_msg, status_code=e.code)

            except URLError as e:
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                raise DealClawError(f"Connection failed: {e.reason}")

    def get(self, path: str, params: Optional[Dict] = None) -> Dict:
        return self._make_request("GET", path, params=params)

    def post(self, path: str, data: Optional[Dict] = None) -> Dict:
        return self._make_request("POST", path, data=data)

    def patch(self, path: str, data: Optional[Dict] = None) -> Dict:
        return self._make_request("PATCH", path, data=data)

    def delete(self, path: str) -> Dict:
        return self._make_request("DELETE", path)
