import {MikroORM} from "@mikro-orm/core"
import "reflect-metadata"
import { COOKIENAME, __prod__ } from "./constants";
import microConfig from "./mikro-orm.config"
import express from 'express'
import {ApolloServer} from 'apollo-server-express'
import {buildSchema} from 'type-graphql'
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from 'ioredis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import cors from 'cors'

const main = async () => {
    const orm = await MikroORM.init(microConfig);    
    await orm.getMigrator().up()

    const app = express();
    
    const RedisStore = connectRedis(session)
    const redis = new Redis()    

    app.use(
        cors({
        origin: "http://localhost:3000",
        credentials: true
    }))

    app.use(
        session({
            name: COOKIENAME,
            store: new RedisStore({
                client: redis,
                disableTouch: true,
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
                httpOnly: true,
                sameSite: 'lax', //csrf
                secure: __prod__ //cookie only works in https
            },
            saveUninitialized: false,
            secret: 'wingsuit_song',
            resave: false
    }))

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [PostResolver, UserResolver],
            validate: false
        }),
        context: ({req, res}) => ({em: orm.em, req, res, redis})
    })

    apolloServer.applyMiddleware({app, cors: false});

    app.listen(4000, () => {
        console.log("sever on localhost:4000")
    })    
}

main().catch(err => {
    console.error(err)
});