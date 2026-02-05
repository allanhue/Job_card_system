# Job Card System

 Full stack  and invoice management system with Zoho Books sync, role-based access, email notifications, and analytics dashboards.

## Features
- Role-based access (admin/user)
- Zoho Books invoice sync
- Job card creation with uploads and email notifications
- Analytics dashboards (summary + detailed)
- Password reset via email

## Tech Stack
- Frontend: Next.js (App Router), React, TypeScript
- Backend: FastAPI, SQLAlchemy, PostgreSQL (Neon)
- Email: Brevo SMTP

## Quick Start

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
cd back
python -m venv venv
# activate venv
pip install -r requirements.txt
uvicorn main:app --reload
```

## Scripts
- `npm run dev` � start frontend
- `npm run build` � production build
- `npm run start` � serve production build

