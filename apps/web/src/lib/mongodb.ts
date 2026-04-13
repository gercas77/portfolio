import { MongoClient } from "mongodb";

const options = {};

let productionClientPromise: Promise<MongoClient> | undefined;

export default function getMongoClientPromise(): Promise<MongoClient> {
    if (process.env.NODE_ENV === "development") {
        const globalWithMongo = global as typeof globalThis & {
            _mongoClientPromise?: Promise<MongoClient>;
        };

        if (!globalWithMongo._mongoClientPromise) {
            const uri = process.env.MONGODB_URI;
            if (!uri) {
                throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
            }

            const client = new MongoClient(uri, options);
            globalWithMongo._mongoClientPromise = client.connect();
        }

        return globalWithMongo._mongoClientPromise;
    }

    if (!productionClientPromise) {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
        }

        const client = new MongoClient(uri, options);
        productionClientPromise = client.connect();
    }

    return productionClientPromise;
}
