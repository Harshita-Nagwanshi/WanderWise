# WanderWise

**Your next adventure, intelligently planned.**

WanderWise is an AI-powered travel itinerary planner that helps you create personalized, day-by-day travel plans based on your destination, budget, travel dates, interests, and travel style.
Live Demo: wander-wise-swart.vercel.app

## Features

- **Personalized itineraries** tailored to your travel preferences.
- **Day-by-day planning** to organize activities throughout your trip.
- **Budget estimation** for accommodation, food, transportation, and activities.
- **AI-powered recommendations** using Groq and Llama models.
- **Travel suggestions** for attractions, dining, and transportation.
- **Trip management** to save, edit, regenerate, and delete itineraries.
- **Authentication** through optional Supabase integration.
- **Cloud storage** for saving and retrieving trips.
- **Responsive interface** for desktop and mobile screens.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend |
| Vite | Development and build tooling |
| Tailwind CSS | Styling |
| FastAPI | Backend API |
| Python | Backend development |
| Groq / Llama | AI itinerary generation |
| Supabase | Authentication and database |

## Getting Started

### Prerequisites

- Node.js and npm
- Python
- Groq API key (optional)
- Supabase project (optional)

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/<your-username>/<your-repository>.git
cd <your-repository>
```

**2. Start the backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

**3. Start the frontend**

Open a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open the local URL displayed by Vite in your browser.

Configure the environment variables in the respective `.env` files to enable AI generation and Supabase features.

## Environment Variables

### Backend

- `GROQ_API_KEY` — Enables AI itinerary generation.
- `GROQ_MODEL` — Specifies the Groq model.
- `SUPABASE_URL` — Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side Supabase credentials. Keep this secret.

### Frontend

- `VITE_API_URL` — Backend API URL.
- `VITE_SUPABASE_URL` — Supabase project URL.
- `VITE_SUPABASE_ANON_KEY` — Supabase publishable/anon key.

Never commit secret keys or `.env` files to GitHub.

## Future Improvements

- Interactive maps and route visualization
- Real-time weather information
- Live attraction details and opening hours
- PDF itinerary exports
- More personalized recommendations

## Contributing

Contributions, feature suggestions, and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a pull request.

## License

No license has been specified yet. Add a `LICENSE` file if you intend to distribute the project under an open-source license.

---

**WanderWise — Explore more. Plan smarter. Travel better.**
