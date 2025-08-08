import { createClient } from "redis";

const client = createClient();

client.on('error', (err) => {
    console.error('An error occured while connecting to Redis:\n ' + err)
})

if(!client.isOpen){
    client.connect();
}

export { client }