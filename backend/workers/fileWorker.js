const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');

const { filePath } = workerData;

// Simulate file processing (e.g., compression, encryption)
const processedFilePath = path.join(path.dirname(filePath), `processed_${path.basename(filePath)}`);

fs.copyFileSync(filePath, processedFilePath);

parentPort.postMessage(processedFilePath);