import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

function Register({ setUserEmail }) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const navigate = useNavigate();

    const checkUserExists = async (email) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/check-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            return response.ok && data.exists;
        } catch (error) {
            console.error('Error checking user:', error);
            return false;
        }
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userExists = await checkUserExists(email);

            if (userExists) {
                // User exists, proceed with sign in
                localStorage.setItem('userEmail', email);
                setUserEmail(email);
                navigate('/dashboard');
            } else {
                // User doesn't exist, show register option
                setError('Email not registered. Would you like to register?');
                setShowRegister(true);
            }
        } catch (error) {
            console.error('Sign in error:', error);
            setError('Failed to sign in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            console.log('Registration successful:', data);
            localStorage.setItem('userEmail', email);
            setUserEmail(email);
            navigate('/dashboard');
        } catch (error) {
            console.error('Registration error:', error);
            setError(error.message || 'Failed to register. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center">
                    {showRegister ? 'Register' : 'Sign In'}
                </h2>
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                        {error}
                    </div>
                )}
                <form onSubmit={showRegister ? handleRegister : handleSignIn}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError('');
                                setShowRegister(false);
                            }}
                            className="w-full p-2 border rounded"
                            disabled={loading}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className={`w-full ${showRegister ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
                            } text-white p-2 rounded ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={loading}
                    >
                        {loading
                            ? (showRegister ? 'Registering...' : 'Signing In...')
                            : (showRegister ? 'Register' : 'Sign In')}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Register;