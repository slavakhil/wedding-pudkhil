import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`Wedding server is running on http://localhost:${config.port}`);
});
