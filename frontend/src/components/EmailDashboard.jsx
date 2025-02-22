import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, WS_URL } from '../config';

function EmailDashboard({ userEmail, signOut }) {
    const [recipient, setRecipient] = useState('');
    const [message, setMessage] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [emails, setEmails] = useState([]);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const wsRef = useRef(null);

    useEffect(() => {
        // Fetch existing emails
        fetchEmails();

        // Setup WebSocket connection
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [userEmail]);

    const fetchEmails = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/emails/${userEmail}`);
            if (!response.ok) throw new Error('Failed to fetch emails');
            const data = await response.json();
            setEmails(data);
        } catch (error) {
            setError('Failed to load emails');
        }
    };

    const connectWebSocket = () => {
        wsRef.current = new WebSocket(WS_URL);

        wsRef.current.onopen = () => {
            console.log('WebSocket Connected');
            // Register email address
            wsRef.current.send(userEmail);
        };

        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received:', data);

            switch (data.type) {
                case 'connection':
                    setStatus(data.message);
                    break;
                case 'sent':
                    setStatus(data.message);
                    fetchEmails(); // Refresh email list
                    break;
                case 'newEmail':
                    fetchEmails(); // Refresh when new email received
                    break;
                case 'error':
                    setError(data.message);
                    break;
            }
        };

        wsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            // setError('Connection error occurred');
        };

        wsRef.current.onclose = () => {
            console.log('WebSocket connection closed');
            // Attempt to reconnect after a delay
            setTimeout(connectWebSocket, 3000);
        };
    };

    const handleSendEmail = async (e) => {
        e.preventDefault();
        setError('');
        setStatus('');

        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            setError('Connection is not open');
            return;
        }

        try {
            let attachmentPath = '';
            if (attachment) {
                const formData = new FormData();
                formData.append('file', attachment);
                const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
                    method: 'POST',
                    body: formData,
                });
                const uploadData = await uploadResponse.json();
                attachmentPath = uploadData.filePath;
            }

            wsRef.current.send(`${recipient}|${message}|${attachmentPath}`);
            setRecipient('');
            setMessage('');
            setAttachment(null);
        } catch (error) {
            setError('Failed to send email');
        }
    };

    const handleDeleteEmail = async (emailId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/emails/${emailId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete email');
            fetchEmails(); // Refresh the email list after deletion
            setStatus('Email deleted successfully');
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Send Email</h2>
                {error && <div className="mb-4 text-red-500">{error}</div>}
                {status && <div className="mb-4 text-green-500">{status}</div>}
                <form onSubmit={handleSendEmail} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 mb-2">To:</label>
                        <input
                            type="email"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2">Message:</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full p-2 border rounded h-32"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2">Attachment:</label>
                        <input
                            type="file"
                            onChange={(e) => setAttachment(e.target.files[0])}
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                    >
                        Send Email
                    </button>
                </form>
            </div>

            <div>
                <h2 className="text-2xl font-bold mb-4">Email History</h2>
                <div className="space-y-4">
                    {emails.map((email) => (
                        <div key={email._id} className="p-4 border rounded">
                            <div className="font-bold">
                                {email.from === userEmail ? `To: ${email.to}` : `From: ${email.from}`}
                            </div>
                            <div className="text-gray-600">
                                {new Date(email.timestamp).toLocaleString()}
                            </div>
                            <div className="mt-2">{email.message}</div>
                            {email.attachment && (
                                <div className="mt-2">
                                    <a href={`${API_BASE_URL}${email.attachment}`} download>
                                        Download Attachment
                                    </a>
                                </div>
                            )}
                            <button
                                onClick={() => handleDeleteEmail(email._id)}
                                className="mt-2 bg-red-500 text-white p-1 rounded hover:bg-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sign Out Button */}
            <div className="mt-8">
                <button
                    onClick={signOut}
                    className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}

export default EmailDashboard;