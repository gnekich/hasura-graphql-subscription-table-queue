// This is the function that will be used to interact with the Hasura
const executeWithAdminRights = async (
  operationsDoc,
  operationName,
  variables
) => {
  // Get URL and ADMIN secret!

  const HASURA_GRAPHQL_API_ENDPOINT = process.env.HASURA_GRAPHQL_API_ENDPOINT;
  const HASURA_GRAPHQL_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

  // Make a request
  const result = await fetch(`${HASURA_GRAPHQL_API_ENDPOINT}`, {
    method: "POST",
    body: JSON.stringify({
      query: operationsDoc,
      variables,
      operationName,
    }),
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": HASURA_GRAPHQL_ADMIN_SECRET,
    },
  });

  const jsonResult = await result
    .json()
    .then((data) => {
      return data;
    })
    .catch((error) => {
      console.log(error);
      return undefined;
    });

  // Return JSON
  return jsonResult;
};

export { executeWithAdminRights };
