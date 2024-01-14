import { executeWithAdminRights } from "./execute.js";
import { TABLE_NAME } from "./utils/constants.js";

export const takeTheJob = async (jobId, workerId) => {
  console.log("Trying to take the job!");

  const TAKE_JOB_QUERY_STRING = /* GraphQL */ `
    mutation takeJob($jobId: uuid!, $workerId: uuid!) {
      result: update_${TABLE_NAME}(
        where: { id: { _eq: $jobId }, worker_id: { _is_null: true } }
        _set: {
          worker_id: $workerId
          status: "processing"
          last_processed_at: "now()"
        }
      ) {
        affected_rows
        returning {
          id
          worker_id
          status
          last_processed_at
          payload
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

export default takeTheJob;
