// Helper to determine active base URL
const getBaseUrl = (req) => {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/+$/, '');
  }
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:5000';
  return `${protocol}://${host}`;
};

// Helper to normalize image URLs for client consumption
const normalizeImageUrl = (url, baseUrl) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('http://localhost:5000/uploads/')) {
    return url.replace('http://localhost:5000', baseUrl);
  }
  if (url.startsWith('/uploads/')) {
    return `${baseUrl}${url}`;
  }
  return url;
};

// Clean stored image URL before saving to DB
const cleanStoredImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('http://localhost:5000/uploads/')) {
    return url.replace('http://localhost:5000', '');
  }
  return url;
};

module.exports = {
  getBaseUrl,
  normalizeImageUrl,
  cleanStoredImageUrl
};
