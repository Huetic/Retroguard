from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _key(request: Request) -> str:
    k = request.headers.get("x-api-key")
    return k if k else get_remote_address(request)


limiter = Limiter(key_func=_key)
