const express = require('express');
const { openSlot } = require('../controllers/cabinetController');

const router = express.Router();

// POST /api/cabinet/open
router.post('/open', openSlot);

module.exports = router;
