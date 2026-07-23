import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const publisher = createClient({ url: process.env.REDIS_URL! });
const subscriber = publisher.duplicate();

(async () => {
    await publisher.connect();
    await subscriber.connect();
    console.log("Redis Connected");
})();

export { publisher, subscriber };