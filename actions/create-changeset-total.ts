'use server'

import { client } from "../lib/db"

export async function sendOrGetChangesetTotal(nodes: number | null = null){
    const totalChangesetsFromRedis = await client.get('changesets');
    
    if(totalChangesetsFromRedis && !nodes){
        const totalParsed = parseInt(totalChangesetsFromRedis, 0)

        if(totalParsed > 0){
            return totalParsed;
        }
    }  

    if(!totalChangesetsFromRedis && nodes){
        client.set('changesets', nodes.toString())
        return nodes;
    }

    if(totalChangesetsFromRedis && nodes){
        const totalParsed = parseInt(totalChangesetsFromRedis, 0)

        const newTotal = totalParsed < nodes ? nodes : totalChangesetsFromRedis;
        client.set('changesets', newTotal);

        return parseInt(newTotal.toString(), 0);
    }

    return nodes ?? 0;
}