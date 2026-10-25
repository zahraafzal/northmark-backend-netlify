# NORTHMARK Backend - Netlify Functions Version

This is the Netlify-compatible version of the NORTHMARK backend.

## 🚀 Deployment Steps

### 1. Install Dependencies
```bash
cd backend-netlify
npm install
```

### 2. Netlify Login
```bash
npx netlify login
```

### 3. Initialize Netlify Project
```bash
npx netlify init
```

### 4. Set Environment Variables
In Netlify dashboard:
- Go to Site Settings > Environment Variables
- Add:
  - `MONGO_URI` = (your MongoDB connection string)
  - `JWT_SECRET` = northmark-super-secret-jwt-key-2026-change-in-production

### 5. Deploy
```bash
npx netlify deploy --prod
```

## 📋 API Endpoints

Once deployed, your API will be available at:
`https://YOUR-SITE-NAME.netlify.app/api/`

### Available Endpoints:
- `GET /api` - Health check
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get single order
- `POST /api/newsletter/subscribe` - Subscribe to newsletter

## 🔧 Local Testing
```bash
npm run dev
```

Then access: http://localhost:8888/api

## 📝 Notes
- This version uses serverless functions (runs on-demand)
- MongoDB connection is cached for performance
- CORS enabled for all origins
- Original backend folder remains untouched
