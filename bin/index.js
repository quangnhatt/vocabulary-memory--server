
import http from 'http';
import app from '../app.js';

const port = process.env.PORT || 3002;

(async () => {
    try {
        
        const server = http.createServer(app);
        server.timeout = 5 * 60 * 1000;

        server.listen(port, () => console.log(`Server is listening on port ${port}!`));

    } catch (error) {
        console.log(error);
    }
})();

