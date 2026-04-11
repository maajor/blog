import { generateRSS } from "../src/lib/rss";

generateRSS().then(() => {
  console.log("RSS feed generated at public/rss.xml");
}).catch((err) => {
  console.error("Failed to generate RSS:", err);
  process.exit(1);
});
