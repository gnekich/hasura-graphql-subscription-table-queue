import { executeWithAdminRights } from "./execute.js";
import { TABLE_NAME } from "./utils/constants.js";

export const updateKeepAlive = async (jobId, workerId) => {
  // console.log(`updateKeepAlive the job! ${jobId} by ${workerId}`);

  const TAKE_JOB_QUERY_STRING = /* GraphQL */ `
    mutation updateKeepAlive($jobId: uuid!, $workerId: uuid!) {
      result: update_${TABLE_NAME}(
        where: { id: { _eq: $jobId }, worker_id: { _eq: $workerId } }
        _set: { worker_id: $workerId, last_processed_at: "now()" }
      ) {
        affected_rows
        returning {
          id
          worker_id
          status
          last_processed_at
        }
      }
    }
  `;

  // Check if the job was taken by myself
  const result = await executeWithAdminRights(
    TAKE_JOB_QUERY_STRING,
    undefined,
    {
      jobId,
      workerId,
    }
  );
  // console.log(JSON.stringify(result, null, 2));

  return result;
};

export default updateKeepAlive;
