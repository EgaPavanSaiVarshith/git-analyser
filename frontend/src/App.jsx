import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';
import './App.css';

export default function App() {
  const [dashboardData, setDashboardData] = useState(null);

  const handleAnalyze = (data) => {
    setDashboardData(data);
    setTimeout(() => {
      const dashboardElement = document.getElementById('dashboard');
      if (dashboardElement) {
        dashboardElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="app">
      <Navbar />
      <Hero onAnalyze={handleAnalyze} />
      {dashboardData && <Dashboard data={dashboardData} />}
      <Footer />
    </div>
  );
}
