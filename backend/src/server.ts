import { app } from './app.js'; import { env } from './config/env.js'; app.listen(env.PORT,()=>console.log(`Nexus API on :${env.PORT}`));
