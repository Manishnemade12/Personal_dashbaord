# Portfolio Admin - React Native Mobile App

This is the mobile client application migrated from the Next.js Portfolio Admin dashboard, created inside the `mobile-app/` directory of the repository.

---

## 🚀 App Architecture (Giant Multi-Module Structure)

1. **Master Control Center (`/dashboard`)**:
   - Master Hub displaying live KPIs across all subsystems (Total portfolio items, Inquiries, Active modules).
   - "Portfolio CMS" module launchpad with live counts and deep-linking into the portfolio workspace.
   - Quick shortcut tiles jumping directly to Blogs, Projects, Skills, and Messages.
   - Ecosystem status for backend API server and future giant app extensions (E-commerce, Analytics, Notifications).

2. **Portfolio Subsystem (`/portfolio/*`)**:
   - **`/portfolio/dashboard`**: Specific Portfolio overview (4 gradient stat cards, Year overview published progress, Category table).
   - **`/portfolio/blogs`**: All Blogs and Drafts tabs, search bar, Add & Edit forms (`/portfolio/blogform`).
   - **`/portfolio/projects`**: All Projects and Drafts, live links, Add & Edit forms (`/portfolio/projectform`).
   - **`/portfolio/skills`**: Skills grid, icons, Add/Edit modal.
   - **`/portfolio/gallery`**: Image gallery grid, photo upload modal.
   - **`/portfolio/contacts`**: Messages and customer inquiries inbox with email launcher.

3. **Global Navigation**:
   - Expandable sidebar drawer (`SidebarDrawer.js`) organizing top-level **Main Dashboard**, nested **`/portfolio`** modules, and **API Server Settings**.
   - Breadcrumb navigation with one-tap return to the Master Hub.

---

## 🛠️ How to Run (100% Independent Inside `mobile-app`)

The `mobile-app` directory contains **everything independently**: its own `.env`, its own MongoDB database connection, Mongoose models, and Express REST API backend server!

### 1. Run the Independent Backend Server
Inside `mobile-app`:
```bash
cd mobile-app
npm run server
```
- Connects to your MongoDB database using `mobile-app/.env` (`MONGODB_URI`).
- Starts the independent REST API at `http://localhost:5000/api/*`.

### 2. Run the React Native Mobile App
In another terminal:
```bash
cd mobile-app
npm start
```
From the Expo menu:
- Press **`a`** to open in Android Emulator
- Press **`w`** to open in Web Browser
- Or scan the QR code using **Expo Go** on your physical phone!

---

## 🌐 Device Connection Tips

- **Web Browser**: Connects directly to `http://localhost:5000/api`.
- **Android Emulator**: In the app's **Settings (API Server Host)** screen, set URL to:
  `http://10.0.2.2:5000/api`
- **Physical Device (Expo Go)**: Set URL to your computer's local Wi-Fi IP:
  `http://<YOUR_COMPUTER_IP>:5000/api`
- **Offline Mode**: If the database or server is offline, the app automatically switches to an internal local database so you never experience crashes or blank screens!
