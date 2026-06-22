# GitHub Insight - Frontend

A production-ready React frontend for GitHub analytics and profile analysis dashboard.

## Features

- 🔍 Search GitHub profiles by username or URL
- 📊 Beautiful analytics dashboard
- 📱 Fully responsive design
- ⚡ Built with React + Vite
- 🎨 Professional SaaS design with pure CSS
- 🚀 Fast performance

## Setup

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

1. Navigate to the frontend folder
2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your backend URL:
```
VITE_API_URL=http://localhost:5000
```

### Running Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Navbar.css
│   │   ├── Hero.jsx
│   │   ├── Hero.css
│   │   ├── Dashboard.jsx
│   │   ├── Dashboard.css
│   │   ├── Footer.jsx
│   │   └── Footer.css
│   ├── services/
│   │   └── api.js
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── public/
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

## Components

### Navbar
- Sticky navigation bar
- Desktop and mobile navigation
- Hamburger menu for mobile

### Hero
- Landing section with call-to-action
- Search input for GitHub username or URL
- Visual illustration

### Dashboard
- Profile card with avatar and stats
- Analytics cards showing key metrics
- Repository list with details
- Fully responsive layout

### Footer
- Professional footer with links
- Technology stack information

## Styling

The project uses pure CSS with:
- CSS variables for theming
- Flexbox and CSS Grid for layout
- Media queries for responsiveness
- Professional color palette
- Smooth animations and transitions

## API Integration

The frontend communicates with the backend API using Axios:

- `POST /api/analyze` - Analyze a GitHub profile
- `GET /api/profile/:username` - Get stored profile
- `GET /api/profiles` - Get all profiles

## Environment Variables

- `VITE_API_URL`: Backend API base URL (default: http://localhost:5000)

## Deployment

### Vercel

1. Push your code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

```bash
# From project root
npm run build
vercel
```

### Other Hosting

1. Build the project:
```bash
npm run build
```

2. Upload the `dist` folder to your hosting provider

3. Set up a redirect rule to serve `index.html` for all routes

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Technologies

- React 18
- Vite
- Axios
- CSS3

## Performance

- Fast build time with Vite
- Optimized bundle size
- Smooth animations and interactions
- Responsive design for all devices
