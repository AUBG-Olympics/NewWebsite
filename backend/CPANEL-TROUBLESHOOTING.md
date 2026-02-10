# cPanel Passenger: "Not found" for /api/events or /

## 1. Application URL may include a path

In **Setup Python App**, check the **Application URL**. If it shows a path (e.g. `dev.aubgolympics.com/backend`), the app only runs under that path.

**Try these URLs (replace with your subdomain):**

- `https://dev.aubgolympics.com/backend/`
- `https://dev.aubgolympics.com/backend/api/events/`
- `https://dev.aubgolympics.com/backend/api/health`

If those return JSON, your API is under `/backend`. Use **`https://dev.aubgolympics.com/backend`** (no trailing slash) as `VITE_API_BASE_URL` when building the frontend.

## 2. App must be Started

In the Python app list, the backend app must show as **Started** (green). If it's stopped or failing, Apache returns 404 for non-file requests. Click **Restart** and open the app **Log** for Python errors.

## 3. .htaccess in the backend folder

On the server, the backend folder must have this in `.htaccess`:

- `RewriteEngine On`
- Force HTTPS rule
- "Serve existing files" rule (so test.txt works)
- `PassengerEnabled On`
- `PassengerStartupFile wsgi.py`

Upload the `.htaccess` from the repo if you changed it locally.

## 4. Entry point and passenger_wsgi.py

- **Application entry point** in cPanel must be **`wsgi:application`**.
- On the server, **remove or rename** `passenger_wsgi.py` if cPanel overwrites it with invalid syntax. Passenger will use `wsgi.py` directly.

## 5. Check the logs

When you open `/api/events/` or `/backend/api/events/`, check the **Passenger log** (link in the Python app or `~/logs/passenger.log`). A traceback there will show:

- Import errors (missing package, wrong path)
- Wrong Python version
- Database errors

Fix the error shown there, then restart the app.
