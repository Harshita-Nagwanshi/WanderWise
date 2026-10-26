import os
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

from itinerary import generate_itinerary  # noqa: E402
from schemas import TripIn, TripRequest  # noqa: E402

app = FastAPI(title="WanderWise API")

origins = [o.strip().rstrip("/") for o in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=os.getenv("ALLOW_ORIGIN_REGEX") or None,
    allow_credentials=False,  # bearer tokens, no cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    msgs = []
    for e in exc.errors():
        field = ".".join(str(p) for p in e["loc"] if p != "body") or "request"
        msgs.append(f"{field}: {e['msg'].removeprefix('Value error, ')}")
    return JSONResponse(status_code=422, content={"detail": "; ".join(msgs)})


@lru_cache
def get_sb():
    url, key = os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    from supabase import create_client
    return create_client(url, key)


def verify(authorization: Optional[str]):
    sb = get_sb()
    if sb is None:
        raise HTTPException(503, "Supabase is not configured on the server; cloud trips are unavailable (demo mode).")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Please sign in to continue.")
    try:
        user = sb.auth.get_user(authorization.split(" ", 1)[1]).user
    except Exception:
        user = None
    if user is None:
        raise HTTPException(401, "Your session is invalid or expired. Please sign in again.")
    return user


def current_user(authorization: Optional[str] = Header(None)):
    return verify(authorization)


def generate_guard(authorization: Optional[str] = Header(None)):
    # Without Supabase configured the planner runs open (demo mode). With it, require login to protect the Groq key.
    return verify(authorization) if get_sb() is not None else None


@app.get("/api/health")
def health():
    return {"status": "ok", "ai_configured": bool(os.getenv("GROQ_API_KEY")), "auth_configured": get_sb() is not None}


@app.post("/api/itinerary/generate")
async def generate(req: TripRequest, _user=Depends(generate_guard)):
    itinerary, source, notice = await generate_itinerary(req)
    return {"itinerary": itinerary, "source": source, "notice": notice}


def row_from(body: TripIn) -> dict:
    return body.model_dump(mode="json", exclude={"variation"}, exclude_none=True)


@app.get("/api/trips")
def list_trips(user=Depends(current_user)):
    res = get_sb().table("trips").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
    return res.data


@app.post("/api/trips", status_code=201)
def create_trip(body: TripIn, user=Depends(current_user)):
    row = row_from(body)
    row["source"] = row.get("source", "demo")
    row["user_id"] = user.id
    res = get_sb().table("trips").insert(row).execute()
    return res.data[0]


@app.get("/api/trips/{trip_id}")
def get_trip(trip_id: uuid.UUID, user=Depends(current_user)):
    res = get_sb().table("trips").select("*").eq("id", str(trip_id)).eq("user_id", user.id).execute()
    if not res.data:
        raise HTTPException(404, "Trip not found.")
    return res.data[0]


@app.put("/api/trips/{trip_id}")
def update_trip(trip_id: uuid.UUID, body: TripIn, user=Depends(current_user)):
    row = row_from(body)
    row["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = get_sb().table("trips").update(row).eq("id", str(trip_id)).eq("user_id", user.id).execute()
    if not res.data:
        raise HTTPException(404, "Trip not found.")
    return res.data[0]


@app.delete("/api/trips/{trip_id}")
def delete_trip(trip_id: uuid.UUID, user=Depends(current_user)):
    res = get_sb().table("trips").delete().eq("id", str(trip_id)).eq("user_id", user.id).execute()
    if not res.data:
        raise HTTPException(404, "Trip not found.")
    return {"deleted": True}
