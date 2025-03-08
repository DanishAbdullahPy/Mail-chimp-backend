const express = require('express');
const router = express.Router();

// Add your campaign routes here
router.get('/example', (req, res) => {
  res.json({ message: 'Campaign route example' });
});

module.exports = router;