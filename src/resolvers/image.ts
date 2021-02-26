import { Arg, Ctx, Field, FieldResolver, Mutation, ObjectType, Query, Resolver, Root } from "type-graphql";
import { COOKIENAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { MyContext } from "../types";


declare module 'express-session' {
    interface SessionData {
        imageList: string[];
    }
}

@Resolver()
export class ImageResolver {

    @Mutation(() => Boolean)
    async setCookieImageList(
        // @Arg('imageList') imageList: string[],
        @Arg('imageList', () => [String]) imageList: string[],
        @Ctx() {req} : MyContext
    ){
        if (imageList) {
            req.session.imageList = imageList;
            return true
        }
        return false
        
    }

    @Query(() => [String], {nullable: true})
    getCookieImageList(
        @Ctx() {req} : MyContext
    ){
        if(!req.session.imageList){
            return null
        }
        return req.session.imageList
    }

}