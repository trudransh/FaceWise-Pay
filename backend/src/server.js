const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'], credentials: true }));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
    const aptosService = require('./services/aptosService');
    res.json({ status: 'OK', timestamp: new Date().toISOString(), aptos: aptosService.getStatus() });
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error', 
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong' 
    });
});



app.listen(PORT, () => {
    console.log(`FaceWise-Pay Backend running on port ${PORT}`);
    console.log(`Network: ${process.env.APTOS_NETWORK || 'devnet'}`);
    console.log(`Health: http://localhost:${PORT}/health`);
});