# Gem Tracker - Full Stack Setup Guide

## 🚀 Project Overview

Gem Tracker is a laboratory management system for gemological testing and certification. It features a **React + TypeScript frontend** and a **Node.js + Express + MongoDB backend**.

---

## 📦 Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB Atlas account** (or local MongoDB instance)

---

## 🛠️ Backend Setup

### 1. Navigate to Backend Directory

```bash
cd gem-tracker-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in `gem-tracker-api/` with the following:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_here
PUBLIC_URL=http://localhost:5000
```

**Note:** The current `.env` file contains the MongoDB connection string. Update if needed.

### 4. Seed the Database

Populate the database with initial users and gem references:

```bash
node src/scripts/seed.js
```

This creates:

- **5 Users** with different roles (Admin, Helper, Tester, Approver)
- **10 Gem References** for testing and identification

### 5. Start the Backend Server

```bash
npm start
```

The backend will run on **http://localhost:5000**

---

## 🎨 Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd gem-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in `gem-tracker/` with:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 4. Start the Frontend Development Server

```bash
npm run dev
```

The frontend will run on **http://localhost:5174** (or next available port)

---

## 🔐 Login Credentials

After seeding the database, use these credentials:

| Role     | Username   | Password      |
| -------- | ---------- | ------------- |
| Admin    | `admin`    | `password123` |
| Helper   | `helper`   | `password123` |
| Tester   | `tester`   | `password123` |
| Approver | `approver` | `password123` |

You can also use the **quick select buttons** on the login page.

---

## 📡 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (Admin only)
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/users` - Get all users (Admin only)

### Gems

- `GET /api/gems` - Get all gems
- `GET /api/gems/:id` - Get gem by ID
- `POST /api/gems/intake` - Create new gem (Helper/Admin)
- `PUT /api/gems/:id/test` - Submit test results (Tester/Admin)
- `PUT /api/gems/:id/approve` - Final approval (Approver/Admin)

### References

- `GET /api/references/search?ri=1.5&sg=3.6` - Search gem references
- `POST /api/references/seed` - Seed references (Admin only)

### Reports

- `POST /api/reports/:id/generate` - Generate PDF report (Approver/Admin)
- `GET /api/reports/:id/verify` - Verify report (Public)

---

## 🧪 Testing the Connection

### 1. Start Both Servers

In separate terminals:

**Terminal 1 (Backend):**

```bash
cd gem-tracker-api
npm start
```

**Terminal 2 (Frontend):**

```bash
cd gem-tracker
npm run dev
```

### 2. Test the Workflow

1. **Login** as `helper` / `password123`
2. **Create a new gem** (Intake form)
3. **Logout** and login as `tester` / `password123`
4. **Process Test 1** on the gem
5. **Logout** and login as `tester2` (or `tester` again)
6. **Process Test 2** on the gem
7. **Logout** and login as `approver` / `password123`
8. **Finalize approval** to generate the certificate

---

## 🗂️ Project Structure

```
gem-tracker/
├── gem-tracker/              # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom hooks (useGemStore)
│   │   ├── lib/              # API utilities and types
│   │   └── App.tsx
│   ├── .env                  # Frontend environment variables
│   └── package.json
│
└── gem-tracker-api/          # Backend (Node.js + Express)
    ├── src/
    │   ├── models/           # MongoDB models
    │   ├── controllers/      # Request handlers
    │   ├── routes/           # API routes
    │   ├── middleware/       # Auth middleware
    │   ├── utils/            # PDF/QR generators
    │   └── scripts/          # Seed scripts
    ├── .env                  # Backend environment variables
    └── package.json
```

---

## 📊 Key Features Connected

✅ **User Authentication** - Login with real JWT tokens  
✅ **Gem Management** - Create, update, and track gems through workflow  
✅ **Testing Workflow** - Test1 → Test2 → Final Approval  
✅ **Reference Database** - Search and suggest gem varieties based on RI/SG  
✅ **PDF Report Generation** - Automated certificate generation with QR code  
✅ **Role-Based Access** - Different permissions for Helper, Tester, Approver, Admin

---

## 🐛 Troubleshooting

### Backend won't start

- Check MongoDB connection string in `.env`
- Ensure MongoDB Atlas allows connections from your IP
- Verify Node.js version: `node --version` (should be v18+)

### Frontend API errors

- Ensure backend is running on port 5000
- Check that `VITE_API_BASE_URL` in frontend `.env` matches backend URL
- Clear browser cache and reload

### "Invalid username or password"

- Run the seed script: `node src/scripts/seed.js`
- Use exact credentials: `admin` / `password123`

---

## 🚢 Deployment

### Backend (Vercel)

The `vercel.json` is already configured. Deploy with:

```bash
cd gem-tracker-api
vercel
```

### Frontend (Vercel/Netlify)

```bash
cd gem-tracker
npm run build
vercel --prod
```

Update `VITE_API_BASE_URL` in production to point to your deployed backend.

---

## 📝 License

This project is for demonstration purposes.

---

## 🙋 Support

For issues or questions, refer to the API documentation in the backend code or check the inline comments in the codebase.
