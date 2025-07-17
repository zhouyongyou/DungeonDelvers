// 簡化的 Apollo Client 配置
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL || 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.4',
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'ignore',
    },
    query: {
      errorPolicy: 'ignore',
    },
  },
});

export default client;