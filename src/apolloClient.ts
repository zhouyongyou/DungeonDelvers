// src/apolloClient.ts

import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { ENV } from './config/env';

// 簡化的 HTTP 連結
const httpLink = createHttpLink({
  uri: ENV.THE_GRAPH_API_URL,
});

// 簡化的 Apollo Client
const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
  },
});

export default client;