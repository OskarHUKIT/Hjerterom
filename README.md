# Boligbanken Application

A modern web application for Boligbanken (Housing Bank) management system.

## Project Structure

```
boligbanken-app/
├── frontend/          # Frontend application
├── backend/           # Backend API
├── docs/              # Documentation
└── README.md          # This file
```

## Features

- User management
- Loan/mortgage applications
- Terms and conditions management
- Document handling
- Training/knowledge base

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install all dependencies (root, frontend, and backend):
```bash
npm run install:all
```

Or install manually:
```bash
# Root dependencies
npm install

# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../backend
npm install
```

### Development

Start both frontend and backend servers:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000 (Next.js)
- Backend API: http://localhost:3001 (Express)

Or run them separately:
```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```

### Building for Production

```bash
npm run build
npm start
```

## Technology Stack

- Frontend: React/Next.js
- Backend: Node.js/Express
- Database: PostgreSQL/MongoDB

