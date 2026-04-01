import hashlib
import time
from typing import Optional

import requests


class CloudinaryError(RuntimeError):
    pass


def _sha1_signature(payload: str) -> str:
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


def _as_public_id(value: Optional[str]) -> Optional[str]:
    """
    Accepts:
    - Cloudinary public_id like "SponsorsLogos/foo"
    - Relative string like "/SponsorsLogos/foo.png"
    - Full delivery URL (best-effort extract)
    Returns a public_id without leading slash and without file extension.
    """
    if not value:
        return None
    v = value.strip()
    if not v:
        return None

    # Full URL: .../image/upload/<transforms>/<public_id>.<ext>
    if v.startswith("http://") or v.startswith("https://"):
        marker = "/image/upload/"
        idx = v.find(marker)
        if idx != -1:
            tail = v[idx + len(marker) :]
            # strip transforms if present
            parts = tail.split("/")
            # find the last segment and assume it's the public_id + extension
            v = parts[-1]
        else:
            # unknown URL form
            return None

    # Strip leading slash
    if v.startswith("/"):
        v = v[1:]

    # Strip extension
    if "." in v.split("/")[-1]:
        v = "/".join(v.split("/")[:-1] + [v.split("/")[-1].split(".")[0]])

    return v or None


def delete_image(*, cloud_name: str, api_key: str, api_secret: str, public_id: str) -> None:
    """
    Deletes an image by public_id using the Admin API destroy endpoint.
    Requires API key/secret on the server.
    """
    ts = int(time.time())
    # Cloudinary signature: sha1("public_id=<id>&timestamp=<ts><api_secret>")
    to_sign = f"public_id={public_id}&timestamp={ts}{api_secret}"
    signature = _sha1_signature(to_sign)

    url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/destroy"
    resp = requests.post(
        url,
        data={
            "public_id": public_id,
            "timestamp": ts,
            "api_key": api_key,
            "signature": signature,
        },
        timeout=20,
    )
    if resp.status_code >= 400:
        raise CloudinaryError(f"Cloudinary destroy failed ({resp.status_code})")

    data = resp.json()
    # result can be "ok" or "not found"
    if data.get("result") not in ("ok", "not found"):
        raise CloudinaryError(f"Cloudinary destroy returned: {data}")


def normalize_logo_public_id(logo_value: Optional[str]) -> Optional[str]:
    return _as_public_id(logo_value)

