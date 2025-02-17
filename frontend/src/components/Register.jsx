import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

function Register({ setUserEmail }) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('Attempting registration with:', email);
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                // If email already exists, prompt the user to sign in
                if (data.error && data.error.includes('already exists')) {
                    setError(data.error);
                    return;
                }
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

    const handleSignIn = () => {
        // Set the email in localStorage and navigate to the dashboard
        localStorage.setItem('userEmail', email);
        setUserEmail(email);
        navigate('/dashboard');
    };

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                        {error}
                        {error.includes('already exists') && (
                            <button
                                onClick={handleSignIn}
                                className="mt-2 w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
                            >
                                Sign In
                            </button>
                        )}
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 border rounded"
                            disabled={loading}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className={`w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 ${loading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        disabled={loading}
                    >
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Register;