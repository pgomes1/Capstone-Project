from fastapi import FastAPI

from config.settings import get_settings
from endpoints.auth_endpoint import router as auth_router
from endpoints.health_endpoint import router as health_router
from endpoints.runs_endpoint import router as runs_router
from lib.errors import register_exception_handlers
from middleware.cors import install_cors


app = FastAPI(title="Fit4Life Backend", version="0.1.0")

install_cors(app)
register_exception_handlers(app)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(runs_router)


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
