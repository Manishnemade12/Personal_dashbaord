# Candidate kit

## Implementation

This repository contains the Employee Attendance & Analytics API requested in
the assignment. The implementation is in `app/main.py` and uses FastAPI,
Pydantic 2 and MongoDB. It creates its indexes idempotently at startup.

Run locally with Python 3.11+, MongoDB 6+, and:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

Set `MONGO_URI` and `MONGO_DB` in the environment (or a local `.env` file).

All API instants are epoch milliseconds. Attendance dates and shift times use
IST, including overnight shifts. Analytics use stored derived attendance
values, while correction history is append-only.

MongoDB **6.0 or newer** is required (the grader uses 7.0). MongoDB Atlas free tier (M0) works.

## Submit
A public Git repository with `app/main.py`, `requirements.txt`, `REVIEW.md`,
`DECISIONS.md`, and this `README.md`.
No `.env`, no secrets, no Dockerfile.
