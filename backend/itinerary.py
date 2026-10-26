import json
import os
from datetime import timedelta

import httpx

from schemas import TripRequest

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SCHEMA_EXAMPLE = """{
  "summary": "2-3 sentence overview",
  "days": [
    {
      "theme": "short day theme",
      "morning":   {"title": "", "description": "", "cost": 0},
      "afternoon": {"title": "", "description": "", "cost": 0},
      "evening":   {"title": "", "description": "", "cost": 0},
      "dining": [{"meal": "Breakfast", "suggestion": "", "cost": 0},
                 {"meal": "Lunch", "suggestion": "", "cost": 0},
                 {"meal": "Dinner", "suggestion": "", "cost": 0}],
      "transport": {"guidance": "", "cost": 0},
      "accommodation_cost": 0,
      "tips": ["", ""]
    }
  ],
  "general_tips": ["", "", ""]
}"""


def num(x, default=0.0) -> float:
    try:
        v = float(x)
        return v if v == v and v >= 0 else default
    except (TypeError, ValueError):
        return default


def text(x, default="") -> str:
    return x.strip() if isinstance(x, str) and x.strip() else default


def slot(s, default_title):
    s = s if isinstance(s, dict) else {}
    return {
        "title": text(s.get("title"), default_title),
        "description": text(s.get("description")),
        "cost": round(num(s.get("cost"))),
    }


def normalize(raw, req: TripRequest, source: str) -> dict:
    days_raw = raw.get("days") if isinstance(raw, dict) else None
    if not isinstance(days_raw, list) or len(days_raw) < req.days:
        raise ValueError(f"itinerary must contain {req.days} days")

    days, acc, food, act, trans = [], 0, 0, 0, 0
    for i in range(req.days):
        d = days_raw[i] if isinstance(days_raw[i], dict) else {}
        dining = [
            {"meal": text(m.get("meal"), "Meal"), "suggestion": text(m.get("suggestion")), "cost": round(num(m.get("cost")))}
            for m in (d.get("dining") or []) if isinstance(m, dict)
        ]
        t = d.get("transport") if isinstance(d.get("transport"), dict) else {}
        day = {
            "day": i + 1,
            "date": (req.start_date + timedelta(days=i)).isoformat(),
            "theme": text(d.get("theme"), f"Day {i + 1} in {req.destination}"),
            "morning": slot(d.get("morning"), "Morning activity"),
            "afternoon": slot(d.get("afternoon"), "Afternoon activity"),
            "evening": slot(d.get("evening"), "Evening activity"),
            "dining": dining,
            "transport": {"guidance": text(t.get("guidance")), "cost": round(num(t.get("cost")))},
            "accommodation_cost": round(num(d.get("accommodation_cost"))),
            "tips": [x for x in (d.get("tips") or []) if isinstance(x, str)][:4],
        }
        acc += day["accommodation_cost"]
        food += sum(m["cost"] for m in dining)
        act += day["morning"]["cost"] + day["afternoon"]["cost"] + day["evening"]["cost"]
        trans += day["transport"]["cost"]
        days.append(day)

    subtotal = acc + food + act + trans
    misc = round(subtotal * 0.05)
    breakdown = {"accommodation": acc, "food": food, "activities": act, "transport": trans, "miscellaneous": misc}
    return {
        "source": source,
        "currency": req.currency,
        "summary": text(raw.get("summary") if isinstance(raw, dict) else None, f"{req.days}-day trip to {req.destination}."),
        "days": days,
        "breakdown": breakdown,
        "total_cost": subtotal + misc,
        "general_tips": [x for x in (raw.get("general_tips") or []) if isinstance(x, str)][:6],
    }


async def call_groq(req: TripRequest) -> dict:
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    prompt = (
        f"Plan a {req.days}-day trip.\n"
        f"Destination: {req.destination}\nStarting from: {req.origin}\n"
        f"Dates: {req.start_date} to {req.end_date}\nTravelers: {req.travelers}\n"
        f"TOTAL budget for the whole group: {req.budget:.0f} {req.currency}\n"
        f"Travel style: {req.style}\nInterests: {', '.join(req.interests)}\n\n"
        f"Rules: all costs are TOTAL for the whole group in {req.currency}, as whole numbers. "
        f"Include accommodation_cost per day. Keep the sum of all costs at or below the budget. "
        f"Include exactly {req.days} day objects, realistic local venues/dishes, and how to get around "
        f"(and how to reach {req.destination} from {req.origin} on day 1 inside transport.guidance). "
        f"Variation seed: {req.variation}.\n\n"
        f"Return ONLY valid JSON in exactly this shape:\n{SCHEMA_EXAMPLE}"
    )
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are an expert travel planner. Respond with a single valid JSON object only."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 8000,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}"}
    async with httpx.AsyncClient(timeout=90) as client:
        r = await client.post(GROQ_URL, json=payload, headers=headers)
    r.raise_for_status()
    return json.loads(r.json()["choices"][0]["message"]["content"])


# ---------------- Demo (non-AI) generator ----------------
ACTIVITIES = {
    "adventure": [("Outdoor adventure activity", "Try a guided trek, cycling route or water sport suited to the area."),
                  ("Rent bikes and explore", "Pick up bikes and ride through scenic parts of the city and outskirts."),
                  ("Sunset viewpoint hike", "Short hike to a local viewpoint; start early and carry water.")],
    "food": [("Local food walk", "Sample street food and regional specialties at well-reviewed stalls."),
             ("Cooking class or market tour", "Visit a local market, then cook a regional dish with a host."),
             ("Dinner at a regional restaurant", "Order the signature local dishes and ask staff for recommendations.")],
    "culture": [("Museum and heritage visit", "Visit the main museum or heritage site; check opening hours in advance."),
                ("Old town and temples/landmarks", "Walk the historic quarter and its religious or civic landmarks."),
                ("Live music or cultural show", "Catch a traditional performance or local arts event.")],
    "nature": [("Park and garden visit", "Spend time in the best nearby park, lake or garden."),
               ("Nature trail or wildlife spot", "Visit a nearby reserve, waterfall or trail."),
               ("Sunset at a scenic spot", "Find an open, scenic spot to watch the sunset.")],
    "shopping": [("Local market shopping", "Browse markets for crafts and souvenirs; bargain politely where customary."),
                 ("Shopping street and boutiques", "Explore the main shopping district for local brands."),
                 ("Evening bazaar stroll", "Visit the night bazaar for snacks and gifts.")],
    "sightseeing": [("Top landmarks tour", "Visit the headline landmarks; book tickets online to skip queues."),
                    ("Hop-on/hop-off or walking tour", "Get an overview of the city with a guided or self-guided tour."),
                    ("Skyline or viewpoint visit", "Go up a viewpoint for panoramic photos.")],
}
SPLIT = {  # accommodation, food, activities, transport (share of budget; remainder is buffer + misc)
    "budget": (0.30, 0.25, 0.15, 0.15),
    "balanced": (0.35, 0.25, 0.17, 0.13),
    "luxury": (0.42, 0.25, 0.15, 0.10),
}


def demo_itinerary(req: TripRequest) -> dict:
    acc_s, food_s, act_s, tr_s = SPLIT[req.style]
    n, b = req.days, req.budget * 0.9
    acc_d, food_d, act_d, tr_d = b * acc_s / n, b * food_s / n, b * act_s / n / 3, b * tr_s / n
    ints = req.interests
    days = []
    for i in range(n):
        picks = [ACTIVITIES[ints[(i + k) % len(ints)]][(i // len(ints) + k) % 3] for k in range(3)]
        arrival = f"Travel from {req.origin} to {req.destination} and settle in. " if i == 0 else ""
        days.append({
            "theme": f"{ints[i % len(ints)].title()} day in {req.destination}",
            "morning": {"title": picks[0][0], "description": picks[0][1], "cost": act_d},
            "afternoon": {"title": picks[1][0], "description": picks[1][1], "cost": act_d},
            "evening": {"title": picks[2][0], "description": picks[2][1], "cost": act_d},
            "dining": [
                {"meal": "Breakfast", "suggestion": f"Local cafe or hotel breakfast in {req.destination}", "cost": food_d * 0.2},
                {"meal": "Lunch", "suggestion": "Popular local eatery near the day's activities", "cost": food_d * 0.35},
                {"meal": "Dinner", "suggestion": "Well-reviewed regional restaurant", "cost": food_d * 0.45},
            ],
            "transport": {"guidance": arrival + "Use local taxis/ride-hailing, metro or buses; walk between nearby sights.", "cost": tr_d},
            "accommodation_cost": acc_d,
            "tips": ["Start early to avoid crowds.", "Keep small change and a power bank handy."],
        })
    raw = {
        "summary": f"Demo-generated {n}-day {req.style} plan for {req.destination} based on your interests "
                   f"({', '.join(ints)}). This is a template itinerary, not AI-generated.",
        "days": days,
        "general_tips": ["Verify opening hours and prices locally.", "Book popular attractions in advance.",
                         "Keep digital and paper copies of your tickets and ID."],
    }
    return normalize(raw, req, "demo")


async def generate_itinerary(req: TripRequest):
    """Returns (itinerary, source, notice)."""
    if not os.getenv("GROQ_API_KEY"):
        return demo_itinerary(req), "demo", "Groq API key not configured on the server. Showing a demo-generated itinerary (not AI-generated)."
    try:
        return normalize(await call_groq(req), req, "ai"), "ai", None
    except httpx.HTTPStatusError as e:
        code = e.response.status_code
        why = {401: "the Groq API key was rejected", 429: "Groq rate limit reached", 400: "the model request was rejected (check GROQ_MODEL)"}.get(code, f"Groq returned HTTP {code}")
    except httpx.HTTPError:
        why = "Groq could not be reached"
    except (ValueError, KeyError, json.JSONDecodeError):
        why = "the AI response was not a valid itinerary"
    return demo_itinerary(req), "demo", f"AI generation failed ({why}). Showing a demo-generated itinerary (not AI-generated)."
