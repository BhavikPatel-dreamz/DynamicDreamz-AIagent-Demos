    const { createServer } = require('https'); // or 'http' for development without SSL
    const { parse } = require('url');
    const next = require('next');
    const fs = require('fs');

    const dev = process.env.NODE_ENV !== 'production';
    const app = next({ dev});
    const handle = app.getRequestHandler();

    const httpsOptions = {
      key: fs.readFileSync('./certificates/privkey.pem'), // Path to your SSL key
      cert: fs.readFileSync('./certificates/fullchain.pem'), // Path to your SSL certificate
    };

    app.prepare().then(() => {
      createServer(httpsOptions, (req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      }).listen(4001, (err) => {
        if (err) throw err;
        console.log('> Ready on https://localhost:4001');
      });
    });