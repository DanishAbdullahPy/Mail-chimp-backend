const jwt = require('jsonwebtoken');

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', {
      algorithms: ['HS256'], // Enforce HS256 algorithm for security
    });

    // Explicitly check token expiration
    if (Date.now() >= decoded.exp * 1000) {
      return res.status(403).json({ message: 'Token expired' });
    }

    req.user = decoded; // Attach decoded user data (e.g., id, email, role) to request
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    return res.status(500).json({ message: 'Token verification failed', details: err.message });
  }
};

// Middleware to authorize based on user role
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Export both middleware functions
module.exports = { authenticateToken, authorizeRole };