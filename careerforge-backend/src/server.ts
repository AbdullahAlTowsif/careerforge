import {Server} from 'http';
import app from './app';

async function startServer() {
    let server: Server;

    try {
        server = app.listen(5000, () => {
            console.log(`🚀 Server is running on PORT 5000`);
        })
    } catch (error) {
        console.log("Something went wrong ", error);
        process.exit(1);
    }
}

startServer();