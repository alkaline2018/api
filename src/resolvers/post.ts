import { MyContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { Arg, Ctx, Field, FieldResolver, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { Post } from "../entities/Post";
import { getConnection } from "typeorm";
import { Updoot } from "../entities/Updoot";
import { User } from "../entities/User";

@InputType()
class PostInput {
    @Field()
    title:string
    @Field()
    text:string
}

@ObjectType()
class PaginatedPosts {
    @Field(() => [Post])
    posts: Post[];
    @Field()
    hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {

    @FieldResolver(() => String)
    textSnippet(
        @Root() root: Post
    ){
        return root.text.slice(0,100);
    }

    @FieldResolver(() => User)
    creator(
        @Root() post: Post,
        @Ctx() {userLoader}: MyContext
    ){
        return userLoader.load(post.creatorId);
    }

    @FieldResolver(() => Int, {nullable:true})
    async voteStatus(
        @Root() post: Post,
        @Ctx() {updootLoader, req}: MyContext
    ) {
        if(!req.session.userId) {
            return null
        }
        const updoot = await updootLoader.load({
            postId: post.id,
            userId: req.session.userId
        })
        return updoot ? updoot.value : null;
    }

    @Mutation(() => Boolean)
    @UseMiddleware(isAuth)
    async vote(
        @Arg('postId', () => Int) postId: number,
        @Arg('value', () => Int) value: number,
        @Ctx(){req}: MyContext
    ) {
        const isUpdoot = value !== -1;
        const realValue = isUpdoot ? 1 : -1
        const { userId } = req.session;

        const updoot = await Updoot.findOne({where: {postId, userId}})

        // the user has voted on the post before
        if (updoot && updoot.value !== realValue){
            // if (updoot.value == 0 ) {
            //     console.log("이전에 같은 값 클릭했을 경우")

            //     await getConnection().transaction(async tm => {
            //         await tm.query(`
            //         UPDATE updoot SET value = ${realValue}
            //         WHERE "userId"=${userId} AND "postId"=${postId}
            //         `)
    
            //         // voet value 1
            //         // post point 1
    
            //         await tm.query(`
            //         UPDATE post
            //         SET points = points + ${realValue}
            //         where id = ${postId};
            //         `)
            //     })
            // } else {
                console.log("설마 얘를 타나?")
                await getConnection().transaction(async tm => {
                    await tm.query(`
                    UPDATE updoot SET value = ${realValue}
                    WHERE "userId"=${userId} AND "postId"=${postId}
                    `)
    
                    // voet value 1
                    // post point 1
    
                    await tm.query(`
                    UPDATE post
                    SET points = points + ${2 * realValue}
                    where id = ${postId};
                    `)
                })
            // }
        } else if (updoot && updoot.value === realValue){
            // console.log("같은 값일 경우")
            // await getConnection().transaction(async tm => {
            //     await tm.query(`
            //     UPDATE updoot SET value = ${0}
            //     WHERE "userId"=${userId} AND "postId"=${postId}
            //     `)

            //     // voet value 1
            //     // post point 1

            //     await tm.query(`
            //     UPDATE post
            //     SET points = points + ${-1 * realValue}
            //     where id = ${postId};
            //     `)
            // })
        } else if (!updoot){
            // has never voted before
            await getConnection().transaction(async tm => {
                await tm.query(`
                INSERT INTO updoot ("userId", "postId", value)
                VALUES (${userId},${postId},${realValue});
                `)

                await tm.query(`
                UPDATE post
                SET points = points + ${realValue}
                where id = ${postId};
                `)
            })
        }

        // Updoot.insert({
        //     userId,
        //     postId,
        //     value: realValue,
        // });
             
        return true
    }

    @Query(()=> PaginatedPosts)
    async posts(
        @Arg('limit', () => Int) limit: number,
        @Arg('cursor', () => String, {nullable:true}) cursor: string | null,
        // @Ctx() {req}: MyContext
    ): Promise<PaginatedPosts>{
        // 20 -> 21

        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = realLimit + 1;
        const replacements: any[] = [realLimitPlusOne]; 

        if (cursor){
            const cursorInt =  new Date(parseInt(cursor))
            replacements.push(cursorInt);
        }
        
        const posts = await getConnection().query(`
            select p.*             
            from post p            
            ${cursor ? `where p. "createdAt" < $2` : ""}
            order by p."createdAt" DESC
            limit $1
        `, replacements);

        return {
            posts: posts.slice(0, realLimit), 
            hasMore: posts.length === realLimitPlusOne
        };
    }

    @Query(()=> Post, {nullable:true})
    post(
        @Arg('id', () => Int) id: number,
    ): Promise<Post | undefined>{
        return Post.findOne(id);
    }

    @Mutation(()=> Post)
    @UseMiddleware(isAuth)
    async createPost(
        @Arg('input') input: PostInput,
        @Ctx() {req}:MyContext
    ): Promise<Post>{
        return Post.create({
            ...input,
            creatorId: req.session.userId
        }).save();
    }

    @Mutation(()=> Post, {nullable: true})
    async updatePost(
        @Arg('id', () => Int) id: number,
        @Arg('title') title: string,
        @Arg('text') text: string,
        @Ctx() {req}: MyContext,
    ): Promise<Post | null>{
        
        const result = await getConnection()
        .createQueryBuilder()
        .update(Post)
        .set({title, text})
        .where('id= :id and "creatorId" = :creatorId', {id, creatorId: req.session.userId})
        .returning("*")
        .execute();

        return result.raw[0]

        // return Post.update({id, creatorId: req.session.userId}, {title, text});
        // 이러면 변경 되기 전디 반환 되는게 아닌가?
    }

    @Mutation(()=> Boolean)
    @UseMiddleware(isAuth)
    async deletePost(
        @Arg('id', () => Int) id: number,
        @Ctx() {req}: MyContext
    ): Promise<boolean>{
        try{
            // not cascade way
            // const post = await Post.findOne(id)
            // if (!post){
            //     return false
            // }
            // if (post.creatorId !== req.session.userId) {
            //     throw new Error("not authorized")
            // }
            // await Updoot.delete({postId: id})
            // await Post.delete({id})


            await Post.delete({id, creatorId: req.session.userId})
            return true
        } catch {
            return false
        }
    }
}