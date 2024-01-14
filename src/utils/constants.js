export const HASURA_GRAPHQL_API_ENDPOINT = `${
  process.env?.HASURA_GRAPHQL_API_ENDPOINT ?? ""
}`;
export const HASURA_GRAPHQL_ADMIN_SECRET = `${
  process.env?.HASURA_GRAPHQL_ADMIN_SECRET ?? ""
}`;

export const TABLE_NAME = "jobs_queue";

export default {
  HASURA_GRAPHQL_API_ENDPOINT,
  HASURA_GRAPHQL_ADMIN_SECRET,
  TABLE_NAME,
};
