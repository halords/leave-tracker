# Leave Tracker

A modern, full-stack Next.js web application for managing office leaves.

## Features
- **Role-Based Access Control**: Admins can manage employees, regular users can file leaves.
- **Automated Balances**: Accurately tracks Vacation (VL), Sick (SL), Privilege (SPL), Wellness (WL), and Forced (FL) leaves.
- **PDF Generation**: Automatically fills out and generates official leave form PDFs for printing.
- **Cron Jobs**: Automatically increments monthly sick/vacation balances and handles annual leave resets.

## Tech Stack
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Database**: Turso (libSQL) + Prisma ORM
- **Authentication**: NextAuth.js
- **PDF Processing**: pdf-lib

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Ensure `.env.local` is configured with your Turso credentials and `NEXTAUTH_SECRET`.

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000`.

## Scripts
A collection of database migration and setup scripts are located in the `/scripts` directory.
