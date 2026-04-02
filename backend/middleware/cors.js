/**
 * CORS Middleware Configuration
 * Enables cross-origin requests for GitHub Pages and remote deployments
 */

const cors = (req, res, next) => {
    // Allow requests from all origins
    res.header('Access-Control-Allow-Origin', '*');
    
    // Allow specific HTTP methods
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Allow specific headers
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Session-ID');
    
    // Allow credentials if needed
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
};

module.exports = cors;
