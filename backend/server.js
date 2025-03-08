const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const multer = require('multer');
const path = require('path');
const { Worker } = require('worker_threads');
const fs = require('fs');
const upath = require('path');

const uploadsDir = upath.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = 3000;
const WS_PORT = 6677;
const SERVER_IP = '192.168.199.200'; // Your server laptop's IP

// MongoDB connection with error handling
mongoose.connect('mongodb://127.0.0.1:27017/email-app')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const emailSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  message: { type: String, required: true },
  attachment: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Email = mongoose.model('Email', emailSchema);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Express middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create HTTP server
const server = http.createServer(app);

// WebSocket server with specific IP binding
const wss = new WebSocketServer({ 
  port: WS_PORT,
  host: SERVER_IP
});

// Store connected clients
const clients = new Map();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  let userEmail = null;

  ws.on('message', async (data) => {
    const message = data.toString();
    console.log('Received message:', message);
    
    if (!userEmail) {
      userEmail = message;
      clients.set(userEmail, ws);
      console.log(`Client registered with email: ${userEmail}`);
      ws.send(JSON.stringify({ type: 'connection', message: `Welcome, ${userEmail}!` }));
    } else {
      try {
        const [recipientEmail, emailContent, attachment] = message.split('|');
        
        if (recipientEmail && emailContent) {
          const emailWorker = new Worker('./workers/emailWorker.js', {
            workerData: {
              from: userEmail,
              to: recipientEmail,
              message: emailContent,
              attachment: attachment || null
            }
          });

          emailWorker.on('message', (savedEmail) => {
            const recipientWs = clients.get(recipientEmail);
            if (recipientWs) {
              recipientWs.send(JSON.stringify({
                type: 'newEmail',
                email: savedEmail
              }));
            }

            ws.send(JSON.stringify({
              type: 'sent',
              message: `Email sent to ${recipientEmail}`
            }));
          });

          emailWorker.on('error', (error) => {
            console.error('Error in email worker:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: error.message
            }));
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
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
app.post('/api/check-user', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const user = await User.findOne({ email });
    res.json({ exists: !!user });
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists. Please sign in.' });
    }

    const user = new User({ email });
    await user.save();
    console.log('User registered:', email);
    res.status(201).json({ message: 'User registered successfully', email });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists. Please sign in.' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/emails/:email', async (req, res) => {
  try {
    const emails = await Email.find({
      $or: [{ from: req.params.email }, { to: req.params.email }]
    }).sort({ timestamp: -1 });
    res.json(emails);
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/emails/:id', async (req, res) => {
  try {
    const emailId = req.params.id;
    const deletedEmail = await Email.findByIdAndDelete(emailId);
    if (!deletedEmail) {
      return res.status(404).json({ error: 'Email not found' });
    }
    res.status(200).json({ message: 'Email deleted successfully' });
  } catch (error) {
    console.error('Error deleting email:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileWorker = new Worker('./workers/fileWorker.js', {
      workerData: { filePath: req.file.path }
    });

    fileWorker.on('message', (processedFilePath) => {
      res.json({ filePath: `/uploads/${path.basename(processedFilePath)}` });
    });

    fileWorker.on('error', (error) => {
      console.error('Error in file worker:', error);
      res.status(500).json({ error: error.message });
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start servers
app.listen(PORT, SERVER_IP, () => {
  console.log(`HTTP Server running at http://${SERVER_IP}:${PORT}`);
});

wss.on('listening', () => {
  console.log(`WebSocket Server running at ws://${SERVER_IP}:${WS_PORT}`);
});

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});