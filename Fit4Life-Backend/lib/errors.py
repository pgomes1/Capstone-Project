from typing import NoReturn

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


INTERNAL_ERROR = "INTERNAL_ERROR"
VALIDATION_ERROR = "VALIDATION_ERROR"
AUTH_ERROR = "AUTH_ERROR"
RUN_NOT_FOUND = "RUN_NOT_FOUND"
SIGNUP_FAILED = "SIGNUP_FAILED"
DB_ERROR = "DB_ERROR"


def _envelope(code: str, message: str, details: dict | None = None) -> dict:
    return {
        "ok": False,
        "error": {"code": code, "message": message, "details": details},
    }


def raise_http(
    code: str,
    message: str,
    status_code: int = 500,
    details: dict | None = None,
) -> NoReturn:
    raise HTTPException(status_code=status_code, detail=_envelope(code, message, details))


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict) and "error" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(INTERNAL_ERROR, str(exc.detail)),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_envelope(
                VALIDATION_ERROR,
                "Request validation failed",
                {"errors": exc.errors()},
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_envelope(INTERNAL_ERROR, str(exc)),
        )
