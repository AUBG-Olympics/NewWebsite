# Deploying the Olympics App on cPanel

This app has two parts:

1. **Frontend** – React (Vite) static build → host on cPanel (e.g. `public_html`).
2. **Backend** – FastAPI (Python) API → you can host it on cPanel using the **Python app deployer**, or elsewhere (Railway, Render, etc.).

---

## 1. Deploy the backend with cPanel’s Python app deployer

You can run the FastAPI backend on the same cPanel account using **WEB APPLICATIONS → CREATE APPLICATION** (Python app deployer). The backend is exposed as a WSGI app via `wsgi.py`.

### 1.1 Upload the backend

1. In **File Manager**, create a folder for the API (e.g. `backend` or `api`) inside your home directory or a subdomain’s root — **not** inside `public_html` if you want the API on a subdomain like `api.aubgolympics.com`.
2. Upload your **entire backend** folder contents (all files and the `src` folder, `requirements.txt`, `wsgi.py`, `alembic`, etc.) into that folder. The path might look like `/home/aubgolympics/backend` or `/home/aubgolympics/api`.

### 1.2 Install dependencies (SSH or cPanel)

The server must have the Python packages installed. If you have **SSH**:

```bash
cd /home/aubgolympics/backend
python3.10 -m venv venv
source venv/bin/activate   # or on Windows: venv\Scripts\activate
pip install -r requirements.txt
```

If cPanel runs the app in its own venv, use **Setup Python App** / **Run pip install** (or the button that installs from `requirements.txt`) so that the same Python environment has `a2wsgi`, `fastapi`, etc.

### 1.3 Create the application in the deployer

In **CREATE APPLICATION** (Python app deployer), use:

| Field | Value |
|--------|--------|
| **Python version** | **3.10** or **3.11** (required for FastAPI). Do **not** use 2.7. |
| **Application root** | Full path to the folder where you uploaded the backend, e.g. `/home/aubgolympics/backend`. (Mandatory.) |
| **Application URL** | The URL for the API, e.g. `api.aubgolympics.com` or a subdomain/path your host assigns. |
| **Application startup file** | Leave empty or set to `wsgi.py` if the form requires a script. |
| **Application entry point** | **`wsgi:application`** — this is the WSGI callable (in `wsgi.py`, the variable is `application`). |
| **Passenger log file** | Use the default (e.g. `/home/aubgolympics/logs/passenger.log`) or leave as suggested. |

**If cPanel overwrites `passenger_wsgi.py`:** Some setups regenerate that file with invalid syntax. You can avoid it entirely: set the entry point to **`wsgi:application`** (as above) and then **delete or rename `passenger_wsgi.py` on the server** (e.g. `passenger_wsgi.py.bak`). Passenger will load `wsgi.py` directly and use `application` from there; `passenger_wsgi.py` is not needed.

Then create the application. The backend will be available at the **Application URL** you chose (e.g. `https://api.aubgolympics.com`). Use that exact URL (no trailing slash) as `VITE_API_BASE_URL` when building the frontend.

### 1.4 Database and env vars

- The app uses **SQLite** by default (`app.db`). Ensure the backend directory is writable by the app user so the database and migrations can run (or set `DATABASE_URL` if you switch to another DB).
- If you need env vars (e.g. `SESSION_SECRET`, Google OAuth), configure them in the same Python app interface (e.g. “Environment variables” or “Define environment”) if available, or via `.env` in the application root.

### 1.5 Run migrations (optional)

If you have SSH:

```bash
cd /home/aubgolympics/backend
source venv/bin/activate
alembic upgrade head
```

Otherwise, run migrations locally and upload the resulting `app.db` if you’re fine with that, or ask your host how to run one-off commands for the Python app.

---

## 2. Alternative: host the backend elsewhere

If cPanel’s Passenger keeps failing (e.g. “not found” for `/api/events`, lock errors, wrong Python), host the API on a different service and keep only the frontend on cPanel.

### 2a. Render (recommended when cPanel doesn’t work)

1. Go to [render.com](https://render.com), sign up (free).
2. **New → Web Service**. Connect your Git repo (GitHub/GitLab).
3. **Settings:**
   - **Name:** e.g. `olympics-api`
   - **Root Directory:** `backend` (so build/start run from the backend folder)
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
4. **Environment:** Add `SESSION_SECRET` (any long random string). Add other vars (e.g. Google OAuth) if you use them.
5. **Create Web Service**. Wait for the first deploy. Your API URL will be like `https://olympics-api-xxxx.onrender.com`.
6. Use that URL (no trailing slash) as `VITE_API_BASE_URL` when building the frontend (see section 3).
7. **CORS:** The backend already allows all origins (`allow_origins=["*"]`). If you restrict it later, add your cPanel domain (e.g. `https://aubgolympics.com`).

**Note:** On Render’s free tier, the app may sleep after inactivity; the first request can be slow. SQLite works but the disk is ephemeral (data can reset on redeploy); for production you can add a Postgres database on Render later.

### 2b. Other options

| Option | Notes |
|--------|--------|
| **Railway** | Connect repo, add Python service, set root to `backend`, start: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`. |
| **PythonAnywhere** | Python-friendly; run FastAPI behind a reverse proxy. |
| **VPS** | Run backend in Docker or systemd. |

Use the resulting API URL as `VITE_API_BASE_URL` when building the frontend.

---

## 3. Build the frontend for production

On your machine (or CI), from the project root:

```bash
cd frontend
npm install
# or: pnpm install
```

Set the API URL to your **live backend** and build:

```bash
# Windows (PowerShell)
$env:VITE_API_BASE_URL="https://your-api.railway.app"; npm run build

# Windows (CMD)
set VITE_API_BASE_URL=https://your-api.railway.app && npm run build

# Linux / macOS
VITE_API_BASE_URL=https://your-api.railway.app npm run build
```

Replace `https://your-api.railway.app` with your real backend URL (no trailing slash).

This creates the `frontend/dist` folder with the production site.

---

## 4. Upload the frontend to cPanel

1. **Log in to cPanel** and open **File Manager**.
2. Go to `public_html` (for the main site) or the folder for your subdomain (e.g. `public_html/olympics` or the subdomain’s document root).
3. **Upload the contents of `frontend/dist`** (not the `dist` folder itself):
   - All files and folders inside `dist/` (e.g. `index.html`, `assets/`, etc.) should be in that directory.
4. If you already have other files there, you can:
   - Create a subfolder (e.g. `olympics`) and upload the `dist` contents there, then visit `https://yourdomain.com/olympics`, or
   - Use a subdomain and set its document root to a new folder, then upload the `dist` contents there.

---

## 5. SPA routing: send all routes to `index.html`

The app uses client-side routing (React Router). So that `/dday`, `/challenge`, etc. work and don’t 404, the server must serve `index.html` for those paths.

In the **same directory** where you uploaded `index.html`, create or edit `.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

- If the site is in a subfolder (e.g. `public_html/olympics`), set `RewriteBase /olympics/` and the last line to `/olympics/index.html [L]`.

---

## 6. CORS on the backend

Your FastAPI app must allow requests from the cPanel domain. In the backend, CORS should include your frontend origin, for example:

```python
# In backend (e.g. main.py) – add your real domain
origins = [
    "http://localhost:5173",
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]
app.add_middleware(CORSMiddleware, allow_origins=origins, ...)
```

Redeploy the backend after changing CORS.

---

## 7. Checklist

- [ ] Backend deployed (cPanel Python app deployer with **Python 3.10+**, **Application root**, **Entry point `wsgi:application`**) or elsewhere, and reachable at a URL (e.g. `https://api.aubgolympics.com`).
- [ ] Frontend built with `VITE_API_BASE_URL` set to that URL.
- [ ] Contents of `frontend/dist` uploaded to the correct cPanel folder (e.g. `public_html` or subdomain root).
- [ ] `.htaccess` in place so SPA routes serve `index.html`.
- [ ] Backend CORS includes `https://yourdomain.com` (and `www` if you use it).

---

## 8. Optional: backend on the same server (VPS with cPanel or SSH)

If you have **cPanel on a VPS** or SSH access and can run long-lived processes:

- Run the FastAPI app (e.g. with `uvicorn`) on a port (e.g. 4000) and put Nginx or Apache in front as a reverse proxy to `http://127.0.0.1:4000`.
- Then use `VITE_API_BASE_URL=https://yourdomain.com` (or `https://api.yourdomain.com`) when building the frontend, and deploy the frontend to the same server as above.

Setup details depend on your host (Nginx/Apache config, SSL, systemd/service for uvicorn). The same build and `.htaccess` steps above still apply for the frontend.

---

## Quick reference

| Step | Command / action |
|------|-------------------|
| Build frontend | `cd frontend` then `VITE_API_BASE_URL=https://YOUR_API_URL npm run build` |
| Upload | Contents of `frontend/dist` into cPanel document root (or subfolder) |
| SPA routing | Add `.htaccess` with the rewrite rules above |

If you tell me your backend URL and whether the site is at the domain root or a subfolder, I can give you the exact `VITE_API_BASE_URL` and `RewriteBase` / rewrite rule to use.
