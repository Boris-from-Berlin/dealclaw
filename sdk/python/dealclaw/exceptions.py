"""DealClaw SDK exceptions."""


class DealClawError(Exception):
    """Base exception for DealClaw SDK."""

    def __init__(self, message: str, status_code: int = None, details: dict = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details or {}


class AuthenticationError(DealClawError):
    """Raised when API key is invalid or expired."""
    pass


class NotFoundError(DealClawError):
    """Raised when a resource is not found."""
    pass


class ValidationError(DealClawError):
    """Raised when request validation fails."""
    pass


class InsufficientBalanceError(DealClawError):
    """Raised when wallet balance is too low."""
    pass


class RateLimitError(DealClawError):
    """Raised when rate limit is exceeded."""
    pass
