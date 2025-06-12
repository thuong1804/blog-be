// src/graphql/index.js
import { ApolloServer } from '@apollo/server';
import typeDefs from './schema.js';
import resolvers from './resolvers.js';

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
});

export default apolloServer;
