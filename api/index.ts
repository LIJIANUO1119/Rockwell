import { createServer } from '../server.js';

let app: any;

export default async function handler(req: any, res: any) {
  console.log('API Request:', req.method, req.url);
  if (!app) {
    console.log('Initializing Express app...');
    app = await createServer();
  }
  return app(req, res);
}
