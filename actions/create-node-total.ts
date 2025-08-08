'use server'

import { client } from "../lib/db"

export async function sendOrGetNodeTotal(nodes: number | null = null){
    const totalNodesFromRedis = await client.get('nodes');
    
    if(totalNodesFromRedis && !nodes){
        const totalParsed = parseInt(totalNodesFromRedis, 0)

        if(totalParsed > 0){
            return totalParsed;
        }
    }  

    if(!totalNodesFromRedis && nodes){
        client.set('nodes', nodes.toString())
        return nodes;
    }

    if(totalNodesFromRedis && nodes){
        const totalParsed = parseInt(totalNodesFromRedis, 0)

        const newTotal = totalParsed < nodes ? nodes : totalNodesFromRedis;
        client.set('nodes', newTotal);

        return parseInt(newTotal.toString(), 0);
    }

    return nodes ?? 0;
}