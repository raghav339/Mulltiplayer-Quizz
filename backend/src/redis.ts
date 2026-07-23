import {createClient} from "redis";

const publisher=createClient();
const subscriber=createClient();

(async ()=>{
    await publisher.connect();
    await subscriber.connect();

    console.log("Redis Connected!")
})();

export {publisher,subscriber};