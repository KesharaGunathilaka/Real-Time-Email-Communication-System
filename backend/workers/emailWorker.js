const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');
const emailSchema = require('../models/emailSchema');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/email-app')
  .then(() => {
    console.log('Worker connected to MongoDB');
  })
  .catch(err => {
    console.error('Worker MongoDB connection error:', err);
    process.exit(1); // Exit the worker if MongoDB connection fails
  });

// Create the Email model
const Email = mongoose.model('Email', emailSchema);

// Destructure worker data
const { from, to, message, attachment } = workerData;

// Create a new email document
const email = new Email({
  from,
  to,
  message,
  attachment,
  timestamp: new Date()
});

// Save the email to the database
email.save()
  .then(savedEmail => {
    // Send the saved email back to the main thread
    parentPort.postMessage(savedEmail);
  })
  .catch(error => {
    // Log the error and send it back to the main thread
    console.error('Error saving email in worker:', error);
    parentPort.postMessage({ error: error.message });
  });