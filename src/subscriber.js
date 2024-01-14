// Subscription part
import { execute } from "apollo-link";
import { WebSocketLink } from "apollo-link-ws";
import { SubscriptionClient } from "subscriptions-transport-ws";
import ws from "ws";
import gql from "graphql-tag";

// Subscribe to the events when the configuration changes
// const HASURA_GRAPHQL_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

export const getWsClient = (wsurl, headersCredentials) => {
  const client = new SubscriptionClient(
    wsurl,
    {
      reconnect: true,
      connectionParams: () => {
        console.log(Array(30 + 1).join("#"));
        console.log("Connecting to...");
        console.log(wsurl);
        console.log(Array(30 + 1).join("-"));
        return {
          headers: {
            // "x-hasura-admin-secret": HASURA_GRAPHQL_ADMIN_SECRET,
            "content-type": "application/json",
            ...headersCredentials,
          },
        };
      },
    },
    ws
  );
  return client;
};

// wsurl: GraphQL endpoint
// query: GraphQL query (use gql`` from the 'graphql-tag' library)
// variables: Query variables object
export const createSubscriptionObservable = (
  wsurl,
  headersCredentials,
  query,
  variables
) => {
  let link = new WebSocketLink(getWsClient(wsurl, headersCredentials));

  // Execute the query immediately
  let observable = execute(link, { query: gql(query), variables: variables });

  // // Refetch the query every 30 seconds
  // setInterval(() => {
  //   console.log("Refetch!");
  //   link = new WebSocketLink(getWsClient(wsurl, headersCredentials));
  //   observable = execute(link, { query: query, variables: variables });
  // }, 30000);

  return observable;
};

// --------------------------------------------------------------------------------
