# Employee Attendance & Analytics API

This project implements the HROne technical assignment using Python, FastAPI,
Pydantic, and MongoDB. The complete application is intentionally kept in
`app/main.py`, as requested by the assignment.

## What is implemented

### Attendance

- Employee creation and paginated employee listing
- Punch-in for `PRESENT`, `WFH`, and `ON_DUTY`
- Punch-out across midnight for overnight shifts
- Manual regularization with append-only audit history
- Paginated attendance search with employee, date-range, and status filters

### Analytics

- Monthly employee attendance summary
- Monthly department summary
- Late-comers leaderboard with standard competition ranking
- Daily department trend with weekend and no-record gap days
- MongoDB explain endpoint for the supported query paths

## Important behavior

- Instants at the API boundary use epoch milliseconds.
- Calendar dates and shift times are interpreted using IST (UTC+05:30).
- Overnight shifts are assigned to the date on which the shift started.
- Late minutes, overtime, work hours, and half-day status are derived by the
  API and stored with the attendance record.
- Manual corrections append one audit entry containing only changed fields.
- MongoDB unique indexes protect employee codes, attendance natural keys, and
  concurrent punch-in requests.

## Requirements

- Python 3.11 or newer
- MongoDB 6.0 or newer

## Setup

Set these environment variables locally. A `.env` file may be used during
development, but it must not be committed:

```text
MONGO_URI=mongodb://localhost:27017
MONGO_DB=attendance_db
```

Install dependencies and start the API:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

The application creates its MongoDB indexes idempotently during startup.
Interactive API documentation is available at
`http://localhost:8000/docs`.

## Repository documentation

- `REVIEW.md` records defects found in the starter implementation and how they
  were addressed.
- `DECISIONS.md` explains index choices, concurrency handling, leaderboard ties,
  headcount calculation, and scalability considerations.

No credentials, `.env` files, Dockerfiles, or assignment source documents are
included in this repository.
