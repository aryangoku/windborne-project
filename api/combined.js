export default async function handler(req, res) {
  try {
    const { url, method } = req;

    const path = url.split('?')[0];

    if (path === '/api/users' && method === 'GET') {
      return res.status(200).json({ users: ['Alice', 'Bob', 'Charlie'] });
    }

    if (path === '/api/users' && method === 'POST') {
      const body = await parseJSON(req);
      return res.status(201).json({ message: 'User created', data: body });
    }

    if (path === '/api/products' && method === 'GET') {
      return res.status(200).json({ products: ['Laptop', 'Phone', 'Tablet'] });
    }


    res.status(404).json({ error: 'Not Found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

function parseJSON(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}
