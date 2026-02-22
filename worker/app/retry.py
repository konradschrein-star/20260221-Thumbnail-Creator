"""
================================================================================
Exponential Backoff Retry Decorator
================================================================================
Implements robust retry logic with exponential backoff for external API calls.

Features:
- Configurable max attempts and backoff strategy
- Specific exception handling (e.g., 429 Too Many Requests)
- Jitter to prevent thundering herd
- Comprehensive logging

Uses tenacity library for production-grade retry logic.
================================================================================
"""

import logging
import random
import time
from functools import wraps
from typing import Any, Callable, Optional, TypeVar, Union

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    wait_random,
    before_sleep_log,
    after_log,
    RetryCallState,
)

logger = logging.getLogger(__name__)

T = TypeVar("T")


class RateLimitError(Exception):
    """Custom exception for rate limit (429) errors."""
    
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


class APIError(Exception):
    """Generic API error with status code."""
    
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


def calculate_backoff_with_jitter(
    attempt: int,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
) -> float:
    """
    Calculate delay with exponential backoff and optional jitter.
    
    Args:
        attempt: Current attempt number (1-indexed)
        base_delay: Initial delay in seconds
        max_delay: Maximum delay cap
        exponential_base: Base for exponential calculation
        jitter: Whether to add random jitter
        
    Returns:
        Delay in seconds
    """
    # Calculate exponential delay
    delay = min(base_delay * (exponential_base ** (attempt - 1)), max_delay)
    
    if jitter:
        # Add ±25% jitter to prevent synchronized retries
        jitter_amount = delay * 0.25
        delay = delay + random.uniform(-jitter_amount, jitter_amount)
    
    return max(0.1, delay)  # Minimum 100ms delay


def retry_with_backoff(
    max_attempts: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    retry_on_rate_limit: bool = True,
    retry_on_server_error: bool = True,
    exceptions: Optional[tuple[type[Exception], ...]] = None,
):
    """
    Decorator factory for exponential backoff retry logic.
    
    Args:
        max_attempts: Maximum number of retry attempts
        base_delay: Initial delay between retries
        max_delay: Maximum delay cap
        exponential_base: Exponential growth factor
        retry_on_rate_limit: Whether to retry on 429 errors
        retry_on_server_error: Whether to retry on 5xx errors
        exceptions: Additional exception types to retry on
        
    Returns:
        Decorated function with retry logic
    """
    # Build list of retryable exceptions
    retry_exceptions = list(exceptions or [])
    
    if retry_on_rate_limit:
        retry_exceptions.append(RateLimitError)
    
    if retry_on_server_error:
        retry_exceptions.append(APIError)
    
    retry_exceptions = tuple(retry_exceptions) if retry_exceptions else (Exception,)
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @retry(
            retry=retry_if_exception_type(retry_exceptions),
            stop=stop_after_attempt(max_attempts),
            wait=wait_exponential(multiplier=base_delay, max=max_delay, exp_base=exponential_base)
            + wait_random(min=0, max=1),  # Add jitter
            before_sleep=before_sleep_log(logger, logging.WARNING),
            after=after_log(logger, logging.INFO),
            reraise=True,
        )
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Check if it's a rate limit error
                if hasattr(e, "response") and hasattr(e.response, "status_code"):
                    if e.response.status_code == 429:
                        retry_after = e.response.headers.get("Retry-After")
                        raise RateLimitError(
                            f"Rate limited (429): {str(e)}",
                            retry_after=int(retry_after) if retry_after else None,
                        )
                    elif 500 <= e.response.status_code < 600:
                        raise APIError(
                            f"Server error ({e.response.status_code}): {str(e)}",
                            status_code=e.response.status_code,
                        )
                raise
        
        return wrapper
    
    return decorator


def async_retry_with_backoff(
    max_attempts: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    retry_on_rate_limit: bool = True,
    retry_on_server_error: bool = True,
    exceptions: Optional[tuple[type[Exception], ...]] = None,
):
    """
    Async version of retry_with_backoff decorator.
    
    Args:
        max_attempts: Maximum number of retry attempts
        base_delay: Initial delay between retries
        max_delay: Maximum delay cap
        exponential_base: Exponential growth factor
        retry_on_rate_limit: Whether to retry on 429 errors
        retry_on_server_error: Whether to retry on 5xx errors
        exceptions: Additional exception types to retry on
        
    Returns:
        Decorated async function with retry logic
    """
    retry_exceptions = list(exceptions or [])
    
    if retry_on_rate_limit:
        retry_exceptions.append(RateLimitError)
    
    if retry_on_server_error:
        retry_exceptions.append(APIError)
    
    retry_exceptions = tuple(retry_exceptions) if retry_exceptions else (Exception,)
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @retry(
            retry=retry_if_exception_type(retry_exceptions),
            stop=stop_after_attempt(max_attempts),
            wait=wait_exponential(multiplier=base_delay, max=max_delay, exp_base=exponential_base)
            + wait_random(min=0, max=1),
            before_sleep=before_sleep_log(logger, logging.WARNING),
            after=after_log(logger, logging.INFO),
            reraise=True,
        )
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                # Check if it's a rate limit error
                if hasattr(e, "response") and hasattr(e.response, "status_code"):
                    if e.response.status_code == 429:
                        retry_after = e.response.headers.get("Retry-After")
                        raise RateLimitError(
                            f"Rate limited (429): {str(e)}",
                            retry_after=int(retry_after) if retry_after else None,
                        )
                    elif 500 <= e.response.status_code < 600:
                        raise APIError(
                            f"Server error ({e.response.status_code}): {str(e)}",
                            status_code=e.response.status_code,
                        )
                raise
        
        return wrapper
    
    return decorator


class RetryContext:
    """
    Context manager for retry operations with manual control.
    
    Example:
        with RetryContext(max_attempts=3) as retry_ctx:
            for attempt in retry_ctx:
                try:
                    result = api_call()
                    retry_ctx.succeed()
                    return result
                except RateLimitError:
                    retry_ctx.fail()
    """
    
    def __init__(
        self,
        max_attempts: int = 5,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.current_attempt = 0
        self._succeeded = False
        self._failed = False
    
    def __enter__(self) -> "RetryContext":
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if not self._succeeded and exc_type is None:
            raise RuntimeError("RetryContext exited without success or exception")
    
    def __iter__(self):
        return self
    
    def __next__(self):
        if self._succeeded:
            raise StopIteration
        
        if self.current_attempt >= self.max_attempts:
            raise StopIteration
        
        self.current_attempt += 1
        
        if self.current_attempt > 1:
            delay = calculate_backoff_with_jitter(
                self.current_attempt - 1,
                self.base_delay,
                self.max_delay,
                self.exponential_base,
            )
            logger.warning(
                f"Retry attempt {self.current_attempt}/{self.max_attempts} "
                f"after {delay:.2f}s delay"
            )
            time.sleep(delay)
        
        return self.current_attempt
    
    def succeed(self) -> None:
        """Mark the operation as successful."""
        self._succeeded = True
    
    def fail(self) -> None:
        """Mark the current attempt as failed."""
        self._failed = True


def log_retry_attempt(retry_state: RetryCallState) -> None:
    """Custom callback for logging retry attempts."""
    if retry_state.attempt_number > 1:
        logger.warning(
            f"Retrying {retry_state.fn.__name__} after attempt {retry_state.attempt_number - 1} "
            f"failed with: {retry_state.outcome.exception()}"
        )
