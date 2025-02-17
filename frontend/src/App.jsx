import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './components/Register';
import EmailDashboard from './components/EmailDashboard';
import { useState } from 'react';

function App() {
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail'));

  const signOut = () => {
    localStorage.removeItem('userEmail'); // Clear the user's email from localStorage
    setUserEmail(null); // Reset the userEmail state
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route
            path="/"
            element={userEmail ? <Navigate to="/dashboard" /> : <Register setUserEmail={setUserEmail} />}
          />
          <Route
            path="/dashboard"
            element={
              userEmail ? (
                <EmailDashboard userEmail={userEmail} signOut={signOut} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;