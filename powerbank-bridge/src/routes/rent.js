const express = require('express');
const { startRent, returnRent } = require('../controllers/rentController');

const router = express.Router();

// POST /api/rent/start
router.post('/start', startRent);

// POST /api/rent/return  (manual/admin override — normal returns come via RabbitMQ 1004)
router.post('/return', returnRent);

module.exports = router;
