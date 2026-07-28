/**
 * Role guard middleware factory.
 * Usage: router.use(jwtVerify, roleGuard('admin'))
 *
 * @param {string} requiredRole - The role required to access the route.
 */
function roleGuard(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        error: `Access denied. Requires role: ${requiredRole}.`,
      });
    }
    next();
  };
}

module.exports = roleGuard;
