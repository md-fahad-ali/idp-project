# SkillStreet - Interactive Learning Platform

## Deployment Instructions for Render

### Prerequisites

- A Render account (https://render.com)
- MongoDB Atlas account for your database
- Your project code pushed to a GitHub repository

### Environment Variables

Set the following environment variables in Render:

```
MONGODB_URI=mongodb+srv://username:password@cluster0.example.mongodb.net/database
JWT_SECRET=your_jwt_secret_key_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
NODE_ENV=production
```

### Deploy to Render

#### Option 1: Using render.yaml (Recommended)

1. Make sure your repository contains the `render.yaml` file
2. Log in to your Render account
3. Go to the Dashboard and click "New" > "Blueprint"
4. Connect your GitHub account and select your repository
5. Render will detect the `render.yaml` file and configure your services
6. Click "Apply" to deploy the services
7. Add the required environment variables in the Render dashboard

#### Option 2: Manual Setup

1. Log in to your Render account
2. Go to Dashboard and click "New" > "Web Service"
3. Connect your GitHub account and select your repository
4. Configure the service:
   - Name: `skillstreet` (or your preferred name)
   - Runtime: `Node`
   - Build Command: `pnpm install && pnpm run build`
   - Start Command: `pnpm start`
5. Add environment variables
6. Click "Create Web Service"

### Post-Deployment

After deployment:

1. Wait for the build and deployment to complete
2. Visit your deployed application at the provided Render URL
3. Update `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` to point to your new Render URL if needed

## Local Development

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Copy `.env.sample` to `.env` and fill in your environment variables
4. Run the development server: `pnpm dev`

The application will be available at `http://localhost:3000`.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
