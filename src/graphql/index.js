// src/graphql/index.js
import { ApolloServer } from "@apollo/server";
import typeDefs from "./schema/index.schema.js";
import resolvers from "./resolvers/resolvers.js";
import { getUserFromRequest } from "../middleware/auth.js";

const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== "production",
});

export function buildContext({ req }) {
    const user = getUserFromRequest(req);
    return { user, req };
}

// expressMiddleware(apolloServer, { context }) is wired in app.js;
// keep a default context builder for standalone/test usage.
export async function context({ req }) {
    return buildContext({ req });
}

export default apolloServer;
