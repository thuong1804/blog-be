// src/graphql/index.js
import { ApolloServer } from '@apollo/server';
import typeDefs from './schema/schema.js';
import resolvers from './resolvers/resolvers.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: () => ({ prisma })
});


export default apolloServer;
