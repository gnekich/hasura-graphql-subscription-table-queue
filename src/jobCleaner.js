/*
    This script will make jobs for the worker to take.
*/
import "dotenv/config";
import { executeWithAdminRights } from "./execute.js";
import { TABLE_NAME } from "./utils/constants.js";

export const jobCleaner = async () => {
  // console.log("Rescheduling all stucked jobs!");

  const CLEAN_THE_JOB_QUERY_STRING = /* GraphQL */ `
    mutation wipeAllCompletedJob($time: timestamptz!) {
      result: delete_${TABLE_NAME}(
        where: {
          status: { _eq: "completed" }
          last_processed_at: {
            # _lte: "get_time_minus_60_seconds()"
            _lte: $time
          }
        }
      ) {
        affected_rows
      }
    }
  `;
  // const CLEAN_THE_JOB_QUERY = gql(CLEAN_THE_JOB_QUERY_STRING);

  // Check if the job was taken by myself
  const result = await executeWithAdminRights(
    CLEAN_THE_JOB_QUERY_STRING,
    undefined,
    {
      time: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // More than 10 minutes completed...
    }
  );
  // console.log(
  //   JSON.stringify(result, null, 2),
  //   new Date(Date.now() - 10 * 60 * 1000).toISOString()
  // );

  const numberOfJobsCleaned = result?.data?.result?.affected_rows;
  if (numberOfJobsCleaned > 0) {
    console.log("Cleaned jobs:", numberOfJobsCleaned);
  }

  return result;
};

const timerJobMaker = setInterval(() => {
  jobCleaner();
}, 10000);

jobCleaner();

export default jobCleaner;
