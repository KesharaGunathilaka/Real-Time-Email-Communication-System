import { useState, useEffect, useRef } from 'react';
import { Trash2, Inbox, SendHorizontal, Mail } from 'lucide-react';
import { API_BASE_URL, WS_URL } from '../config';

function EmailDashboard({ userEmail, signOut }) {
    const [recipient, setRecipient] = useState('');
    const [message, setMessage] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [emails, setEmails] = useState([]);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [filter, setFilter] = useState('all');
    const [showNotification, setShowNotification] = useState(false);
    const wsRef = useRef(null);

    useEffect(() => {
        fetchEmails();
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [userEmail]);

    // ... (keeping all the same functions: fetchEmails, connectWebSocket, handleSendEmail, handleDeleteEmail)
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
            console.log('WebSocket connection opened');
            wsRef.current.send(userEmail);
        };

        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);

            switch (data.type) {
                case 'connection':
                    setStatus(data.message);
                    break;
                case 'sent':
                    setStatus(data.message);
                    setShowNotification(true);// Show notification for 3 seconds
                    setTimeout(() => setShowNotification(false), 3000);// Hide notification after 3 seconds
                    fetchEmails(); // Refresh email list

                    break;
                case 'newEmail':
                    fetchEmails();
                    break;
                case 'error':
                    setError(data.message);
                    break;
            }
        };

        wsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        wsRef.current.onclose = () => {
            console.log('WebSocket connection closed');
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
            fetchEmails();
            setStatus('Email deleted successfully');
        } catch (error) {
            setError(error.message);
        }
    };

    // Filter emails based on the selected filter
    const filteredEmails = emails.filter(email => {
        switch (filter) {
            case 'incoming':
                return email.to === userEmail;
            case 'outgoing':
                return email.from === userEmail;
            default:
                return true;
        }
    });

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            {/* Notification */}
            {showNotification && (
                <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-500 text-green-700 px-4 py-3 rounded">
                    Email sent successfully!
                </div>
            )}

            {/* New Email Form */}
            <div className="bg-white rounded-lg shadow-md mb-8 p-6">
                <h2 className="text-2xl font-bold mb-4">New Email</h2>
                {error && <div className="mb-4 bg-red-100 border border-red-500 text-red-700 px-4 py-3 rounded">{error}</div>}
                {status && <div className="mb-4 bg-green-100 border border-green-500 text-green-700 px-4 py-3 rounded">{status}</div>}

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
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
                    >
                        <SendHorizontal size={18} />
                        Send Email
                    </button>
                </form>
            </div>

            {/* Email History */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">Email History</h2>

                {/* Filter Tabs */}
                <div className="flex space-x-4 mb-4 border-b">
                    <button
                        onClick={() => setFilter('all')}
                        className={`flex items-center gap-2 px-4 py-2 ${filter === 'all' ? 'border-b-2 border-blue-500' : ''}`}
                    >
                        <Mail size={18} />
                        All
                    </button>
                    <button
                        onClick={() => setFilter('incoming')}
                        className={`flex items-center gap-2 px-4 py-2 ${filter === 'incoming' ? 'border-b-2 border-blue-500' : ''}`}
                    >
                        <Inbox size={18} />
                        Incoming
                    </button>
                    <button
                        onClick={() => setFilter('outgoing')}
                        className={`flex items-center gap-2 px-4 py-2 ${filter === 'outgoing' ? 'border-b-2 border-blue-500' : ''}`}
                    >
                        <SendHorizontal size={18} />
                        Outgoing
                    </button>
                </div>

                {/* Email List */}
                <div className="space-y-4">
                    {filteredEmails.map((email) => (
                        <div key={email._id} className="p-4 border rounded hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold">
                                        {email.from === userEmail ? `To: ${email.to}` : `From: ${email.from}`}
                                    </div>
                                    <div className="text-gray-600 text-sm">
                                        {new Date(email.timestamp).toLocaleString()}
                                    </div>

                                    <div className="mt-2">{email.message}</div>
                                    {email.attachment && (
                                        <div className="mt-2">
                                            <a href={`${API_BASE_URL}${email.attachment}`} download>
                                                <button
                                                    className="text-white bg-blue-600 w-48 h-10 rounded-md font-semibold hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                                                >
                                                    Download Attachment
                                                </button>
                                            </a>
                                        </div>
                                    )}

                                </div>
                                <button
                                    onClick={() => handleDeleteEmail(email._id)}
                                    className="text-red-600 p-2 rounded hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}

                </div>
            </div>

            {/* Sign Out Button */}

            <div className="mt-8">
                <button
                    onClick={signOut}
                    className="mt-8 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}

export default EmailDashboard;