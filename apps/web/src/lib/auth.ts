import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import getMongoClientPromise from "@/lib/mongodb";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        }),
    ],

    callbacks: {
        async signIn({ user }) {
            if (!user.email) return false;

            const client = await getMongoClientPromise();
            const db = client.db(process.env.MONGODB_DB_NAME);

            await db.collection("users").updateOne(
                { email: user.email },
                {
                    $set: {
                        name: user.name ?? null,
                        pictureUrl: user.image ?? null,
                        lastLoginAt: new Date(),
                    },
                    $setOnInsert: {
                        createdAt: new Date(),
                    },
                },
                { upsert: true },
            );

            return true;
        },

        async session({ session }) {
            if (session.user?.email) {
                const client = await getMongoClientPromise();
                const db = client.db(process.env.MONGODB_DB_NAME);
                const dbUser = await db.collection("users").findOne(
                    { email: session.user.email },
                    { projection: { _id: 1 } },
                );
                if (dbUser) {
                    session.user.id = dbUser._id.toString();
                }
            }
            return session;
        },
    },

};
