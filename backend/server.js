const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const PORT = 3000;
const WS_PORT = 6677;
const SERVER_IP = '192.168.1.2'; // Replace with your server laptop's IP

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/email-app');

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const emailSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Email = mongoose.model('Email', emailSchema);

// Express middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

// Store connected clients
const clients = new Map();

// WebSocket connection handler
wss.on('connection', (ws) => {
  let userEmail = null;

  ws.on('message', async (data) => {
    const message = data.toString();
    
    if (!userEmail) {
      // First message is the email registration
      userEmail = message;
      clients.set(userEmail, ws);
      console.log(`Client registered with email: ${userEmail}`);
      ws.send(JSON.stringify({ type: 'connection', message: `Welcome, ${userEmail}!` }));
    } else {
      try {
        // Parse the message for recipient and content
        const [recipientEmail, emailContent] = message.split('|');
        
        if (recipientEmail && emailContent) {
          // Save email to MongoDB
          const email = new Email({
            from: userEmail,
            to: recipientEmail,
            message: emailContent
          });
          await email.save();

          // Send to recipient if online
          const recipientWs = clients.get(recipientEmail);
          if (recipientWs) {
            recipientWs.send(JSON.stringify({
              type: 'newEmail',
              email: {
                from: userEmail,
                message: emailContent,
                timestamp: new Date()
              }
            }));
          }

          // Confirm to sender
          ws.send(JSON.stringify({
            type: 'sent',
            message: `Email sent to ${recipientEmail}`
          }));
        }
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    }
  });

  ws.on('close', () => {
    if (userEmail) {
      clients.delete(userEmail);
      console.log(`Client disconnected: ${userEmail}`);
    }
  });
});

// Express Routes
app.post('/api/register', async (req, res) => {
    try {
      const { email } = req.body;
  
      // Check if the email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists. Please sign in.' });
      }
  
      // If email does not exist, create a new user
      const user = new User({ email });
      await user.save();
      res.status(201).json({ message: 'User registered successfully', email });
    } catch (error) {
      // Handle duplicate key error (E11000)
      if (error.code === 11000) {
        return res.status(400).json({ error: 'Email already exists. Please sign in.' });
      }
      // Handle other errors
      res.status(400).json({ error: error.message });
    }
  });

app.get('/api/emails/:email', async (req, res) => {
  try {
    const emails = await Email.find({
      $or: [{ from: req.params.email }, { to: req.params.email }]
    }).sort({ timestamp: -1 });
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete email route
app.delete('/api/emails/:id', async (req, res) => {
  try {
    const emailId = req.params.id;
    const deletedEmail = await Email.findByIdAndDelete(emailId);
    if (!deletedEmail) {
      return res.status(404).json({ error: 'Email not found' });
    }
    res.status(200).json({ message: 'Email deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
  console.log(`WebSocket Server running on port ${WS_PORT}`);
});

