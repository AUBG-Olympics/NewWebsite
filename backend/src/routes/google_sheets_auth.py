import os
from fastapi import APIRouter, Depends, Request
from starlette.responses import JSONResponse
from src.util.auth import google_sheets, admin_required

router = APIRouter(prefix="/api/sheets", tags=["Google Sheets"])


@router.get("/authorize")
async def authorize_sheets(
    request: Request,
    _=Depends(admin_required),
):
    redirect_uri = request.url_for("sheets_callback")
    return await google_sheets.authorize_redirect(
        request, redirect_uri, access_type="offline"
    )


@router.get("/callback", name="sheets_callback")
async def sheets_callback(
    request: Request,
    _=Depends(admin_required),
):
    token = await google_sheets.authorize_access_token(request)

    print(f"Token: {token}")
    refresh_token = token.get("refresh_token")
    if not refresh_token:
        return JSONResponse(
            {
                "error": (
                    "No refresh token returned. "
                    "Revoke app access in Google Account and retry with "
                    "access_type=offline & prompt=consent."
                )
            },
            status_code=400,
        )

    env_path = ".env"
    lines = []

    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()

    with open(env_path, "w") as f:
        found = False
        for line in lines:
            if line.startswith("GOOGLE_REFRESH_TOKEN="):
                f.write(f"GOOGLE_REFRESH_TOKEN={refresh_token}\n")
                found = True
            else:
                f.write(line)
        if not found:
            f.write(f"\nGOOGLE_REFRESH_TOKEN={refresh_token}\n")

    return JSONResponse(
        {"status": "OK", "message": "Refresh token saved to .env. Restart the server."}
    )
