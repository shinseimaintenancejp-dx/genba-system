from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger(__name__)

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    try:
        body = await request.body()
        logger.error(f"Validation Error for {request.url}")
        logger.error(f"Body: {body.decode()}")
        logger.error(f"Errors: {exc.errors()}")
    except Exception as e:
        logger.error(f"Could not read body: {e}")
        
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()}
    )
