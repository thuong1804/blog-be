// src/graphql/index.js
import { ApolloServer } from "@apollo/server";
import typeDefs from "./schema/index.schema.js";
import resolvers from "./resolvers/resolvers.js";

const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
        const authHeader = req.headers.authorization || "";
        const user = getUserFromToken(authHeader);

        return { user };
    },
    introspection: true
});

export default apolloServer;
