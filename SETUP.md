# Setup Guide

## Initial Setup

1. **Install Node.js**
   - Download and install Node.js v18 or higher from [nodejs.org](https://nodejs.org/)

2. **Clone or navigate to the project directory**
   ```bash
   cd C:\Users\oskar\Desktop\Cursor.test
   ```

3. **Install dependencies**
   ```bash
   npm run install:all
   ```

4. **Set up environment variables**
   - Copy `backend/.env.example` to `backend/.env`
   - Adjust settings if needed

5. **Start the development servers**
   ```bash
   npm run dev
   ```

## Project Structure

```
Cursor.test/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # Next.js app directory
│   │   ├── page.tsx         # Home page
│   │   ├── applications/    # Applications page
│   │   ├── terms/          # Terms and conditions page
│   │   ├── documents/      # Documents page
│   │   └── training/       # Training page
│   ├── package.json
│   └── tsconfig.json
├── backend/                 # Express.js backend API
│   ├── server.js           # Main server file
│   └── package.json
├── docs/                    # Documentation
│   └── REQUIREMENTS.md     # Requirements document
├── package.json            # Root package.json
└── README.md
```

## Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend
- `npm run install:all` - Install all dependencies
- `npm run build` - Build frontend for production

### Frontend
- `npm run dev` - Start Next.js dev server (port 3000)
- `npm run build` - Build for production
- `npm run start` - Start production server

### Backend
- `npm run dev` - Start Express server with nodemon (port 3001)
- `npm start` - Start production server

## Next Steps

1. **Review Requirements**
   - Check `docs/REQUIREMENTS.md` for feature requirements
   - Review the source documents in `c:\Users\oskar\Desktop\BolyBeskrivelse`

2. **Extract Document Content**
   - The PDF and DOCX files need to be processed to extract detailed requirements
   - Consider using a PDF/DOCX parser or manual extraction

3. **Implement Features**
   - Add database integration (PostgreSQL, MongoDB, or SQLite)
   - Implement authentication
   - Add file upload functionality
   - Connect frontend to backend APIs

4. **Customize**
   - Update styling to match brand guidelines
   - Add specific business logic
   - Implement data models based on requirements

## Troubleshooting

### Port Already in Use
If port 3000 or 3001 is already in use:
- Change the port in `frontend/package.json` or `backend/server.js`
- Or stop the process using that port

### Module Not Found
Run `npm run install:all` to ensure all dependencies are installed.

### TypeScript Errors
Make sure TypeScript is properly installed:
```bash
cd frontend
npm install
```







