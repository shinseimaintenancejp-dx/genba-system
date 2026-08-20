from fastapi import Request
import logging

logger = logging.getLogger("REQUEST_LOGGER")

async def log_requests(request: Request, call_next):
    if request.url.path == "/api/v1/contracts" and request.method == "POST":
        body = await request.body()
        logger.error(f"POST /api/v1/contracts BODY: {body.decode()}")
        # We must re-inject the body because reading it consumes the stream
        from starlette.requests import ClientDisconnect
        async def receive():
            return {"type": "http.request", "body": body}
        request._receive = receive
    response = await call_next(request)
    return response
