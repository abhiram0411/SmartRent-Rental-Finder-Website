// Vercel uses the compiled server so Nest's validation metadata is preserved.
const { createApp } = require("../build-server/server/main.js");
let appPromise;
module.exports = async function handler(request, response) {
  appPromise ??= createApp();
  const app = await appPromise;
  app.getHttpAdapter().getInstance()(request, response);
};
