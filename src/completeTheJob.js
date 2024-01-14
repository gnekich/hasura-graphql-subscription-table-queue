import { executeWithAdminRights } from "./execute.js";
import { TABLE_NAME } from "./utils/constants.js";

export const completeTheJob = async (
  jobId,
  workerId,
  status = "completed",
  jobResultPayload
) => {
  console.log(`Complete the job! ${jobId} by ${workerId}`);

  const COMPLETE_JOB_QUERY_STRING = /* GraphQL */ `
    mutation completeTheJob(
      $jobId: uuid!
      $workerId: uuid!
      $status: String!
      $jobResultPayload: jsonb!
    ) {
      result: update_${TABLE_NAME}(
        where: { id: { _eq: $jobId }, worker_id: { _eq: $workerId } }
        _set: {
          worker_id: $workerId
          status: $status
          last_processed_at: "now()"
          result: $jobResultPayload
        }
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
    COMPLETE_JOB_QUERY_STRING,
    undefined,
    {
      jobId,
      workerId,
      status,
      jobResultPayload,
    }
  );
  // console.log(JSON.stringify(result, null, 2));

  return result;
};

export default completeTheJob;
