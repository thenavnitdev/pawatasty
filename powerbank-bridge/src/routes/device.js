const express = require('express');
const { getDevice, addDevice } = require('../controllers/deviceController');

const router = express.Router();

// POST /api/device/add  — must be defined before /:uuid to avoid route shadowing
router.post('/add', addDevice);

// GET /api/device/:uuid
router.get('/:uuid', getDevice);

module.exports = router;
