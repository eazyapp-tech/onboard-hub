# Onboard Hub - RentOk Onboarding Management System

A comprehensive onboarding management system built with Next.js and Express.js, featuring Clerk authentication for secure user management.

## Features

- 🔐 **Clerk Authentication** - Secure user authentication and management
- 📅 **Booking Management** - Schedule and manage onboarding sessions
- 👥 **Role-based Access** - Sales and CIS team role management
- 📊 **Dashboard** - Real-time booking and onboarding status tracking
- 🔗 **Google Integration** - Calendar and Sheets synchronization
- 📱 **Responsive Design** - Mobile-friendly interface

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Clerk** - Authentication and user management
- **Framer Motion** - Smooth animations
- **Zustand** - State management

### Backend
- **Express.js** - Node.js web framework
- **MongoDB** - Database with Mongoose ODM
- **Google APIs** - Calendar and Sheets integration
- **Clerk** - User authentication (optional webhooks)

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB instance
- Clerk account
- Google Cloud Platform account (for Calendar/Sheets integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Onboard-hub
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install
   
   # Backend
   cd ../backend
   npm install
   ```

3. **Set up environment variables**

   **Frontend (.env.local):**
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   CLERK_SECRET_KEY=sk_test_your_secret_key_here
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   BACKEND_URL=http://localhost:4000
   ```

   **Backend (.env):**
   ```env
   MONGO_URL=mongodb://localhost:27017/onboarding-hub
   DB_NAME=onboarding-hub
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
   GSUITE_IMPERSONATE_USER=admin@yourdomain.com
   DEALS_SHEET_ID=your_google_sheet_id
   BOOKINGS_SHEET_ID=your_bookings_sheet_id
   CLERK_SECRET_KEY=sk_test_your_secret_key_here
   PORT=4000
   ```

4. **Set up Clerk Authentication**

   - Create a Clerk application at [clerk.com](https://clerk.com)
   - Configure sign-in/sign-up methods (Email, Google, etc.)
   - Add your domain to allowed origins
   - Copy the publishable and secret keys to your environment files

5. **Run the development servers**

   ```bash
   # Backend (Terminal 1)
   cd backend
   npm run dev
   
   # Frontend (Terminal 2)
   cd frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

## Authentication Flow

The application uses Clerk for authentication with the following flow:

1. **Middleware Protection** - All routes except sign-in/sign-up are protected
2. **Automatic Redirects** - Unauthenticated users are redirected to sign-in
3. **User Context** - Authenticated user data is available throughout the app
4. **Role Management** - Users can select between Sales and CIS roles

### Key Authentication Components

- **Middleware** (`src/middleware.js`) - Route protection
- **Layout** (`src/app/layout.tsx`) - Clerk provider configuration
- **Auth Pages** - Pre-built sign-in/sign-up pages
- **Client App** (`src/components/client-app.tsx`) - Main authenticated app

## Project Structure

```
Onboard-hub/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── sign-in/[[...sign-in]]/
│   │   │   ├── sign-up/[[...sign-up]]/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   └── middleware.js
│   ├── package.json
│   └── .env.example
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── README.md
```

## API Endpoints

### Authentication
- All API routes are accessible (authentication handled by frontend)

### Booking Management
- `GET /api/bookings` - List all bookings
- `POST /api/bookings` - Create new booking
- `PATCH /api/onboarding/:id` - Update onboarding details

### Health Check
- `GET /health` - Server health status

## Deployment

### Frontend (Vercel/Netlify)
1. Connect your repository
2. Set environment variables
3. Deploy

### Backend (Railway/Render/Heroku)
1. Connect your repository
2. Set environment variables
3. Deploy

### Environment Variables for Production
Make sure to update the `BACKEND_URL` in frontend environment variables to point to your deployed backend URL.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
- Check the documentation
- Review environment variable setup
- Verify Clerk configuration
- Check MongoDB connection

## License

This project is proprietary software for RentOk internal use.