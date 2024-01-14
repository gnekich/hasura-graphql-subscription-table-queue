/*
    This script will make jobs for the worker to take.
*/
import "dotenv/config";
import { executeWithAdminRights } from "./execute.js";
import { TABLE_NAME } from "./utils/constants.js";

export const jobsRescheduler = async () => {
  // console.log("Rescheduling all stucked jobs!");

  const RESCHEDULE_THE_JOB_QUERY_STRING = /* GraphQL */ `
    mutation jobsRescheduler($time: timestamptz!) {
      result: update_${TABLE_NAME}(
        where: {
          status: { _eq: "processing" }
          last_processed_at: {
            # _lte: "get_time_minus_60_seconds()"
            _lte: $time
          }
        }
        _set: { status: "new", worker_id: null }
        _inc: { number_of_retries: 1 }
      ) {
        affected_rows
      }
    }
  `;
  // const RESCHEDULE_THE_JOB_QUERY = gql(RESCHEDULE_THE_JOB_QUERY_STRING);

  // Check if the job was taken by myself
  const result = await executeWithAdminRights(
    RESCHEDULE_THE_JOB_QUERY_STRING,
    undefined,
    {
      time: new Date(Date.now() - 60 * 1000).toISOString(),
    }
  );
  // console.log(JSON.stringify(result, null, 2));

  const numberOfJobsRescheduled = result?.data?.result?.affected_rows;
  if (numberOfJobsRescheduled > 0) {
    console.log("Rescheduled jobs:", numberOfJobsRescheduled);
  }

  return result;
};

const timerJobMaker = setInterval(() => {
  jobsRescheduler({ timestamp: Date.now() });
}, 10000);

jobsRescheduler({ timestamp: Date.now() });

export default jobsRescheduler;
