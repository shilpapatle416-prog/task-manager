const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - ensures that request has a valid JWT token
 * and attaches authenticated user document to req.user
 */
const protect = async (req, res, next) => {
  let token;

  // Check Bearer token in authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Alternatively check cookie if used
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please log in.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_jwt_key_task_manager_2026_modern_secure'
    );

    // Fetch user without password
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Invalid token.'
    });
  }
};

module.exports = { protect };
