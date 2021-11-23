const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');

// load process env
const projectPath = path.resolve('.');
if (fs.existsSync(path.resolve(projectPath, '../configs/.env'))) {
    dotenv.config({ path: path.resolve(projectPath, '../configs/.env') });
} else {
    dotenv.config({ path: path.resolve(projectPath, '.env') })
}

const app = require('../app.js');

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

