import { ApolloServer } from 'apollo-server-express';
import connectRedis from 'connect-redis';
import "dotenv-safe/config";
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import Redis from 'ioredis';
import "reflect-metadata";
import { buildSchema } from 'type-graphql';
import { createConnection, getConnection } from 'typeorm';
import { COOKIENAME, __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import path from "path"
import { Updoot } from './entities/Updoot';
import { createUserLoader } from './utils/createUserLoader';
import { createUpdootLoader } from './utils/createUpdootLoader';
import { ImageResolver } from './resolvers/image';

const main = async () => {
    const conn = await createConnection({
        type: 'postgres',
        // database: 'wingsuit2',
        // port: 5433,
        // username:'song',
        // password: 'ramona117@',
        url:process.env.DATABASE_URL,
        entities: [Post,User, Updoot],
        migrations: [path.join(__dirname,"./migrations/*")],
        logging: true,
        // synchronize: true,        
    })
   
    await conn.runMigrations();

    // await Updoot.delete({});
    // await getConnection()
    // .createQueryBuilder()
    // .update(Post)
    // .set({ points: 0})
    // .execute();

    const app = express();
    
    const RedisStore = connectRedis(session)
    const redis = new Redis(process.env.REDIS_URL)    
    app.set("trust proxy", 1);
    app.use(
        cors({
        origin: process.env.CORS_ORIGIN,
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
                secure: __prod__, //cookie only works in https
                domain: __prod__ ? '.s-wingsuit.com' : undefined,
            },
            saveUninitialized: false,
            secret: process.env.SESSION_SECRET,
            resave: false
    }))

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [PostResolver, UserResolver, ImageResolver],
            validate: false
        }),
        context: ({req, res}) =>  ({ req, res, redis, 
            userLoader: createUserLoader(),
            updootLoader: createUpdootLoader(),
        })
    })

    apolloServer.applyMiddleware({app, cors: false});

    app.listen(parseInt(process.env.PORT), () => {
        console.log(`sever on localhost:${process.env.PORT}`)
    })    
}

main().catch(err => {
    console.error(err)
});
