/*
    This script will make jobs for the worker to take.
*/
import "dotenv/config";
import crypto from "crypto";
import { executeWithAdminRights } from "./execute.js";
import { randomName } from "./utils/randomPokemonName.js";
import { TABLE_NAME } from "./utils/constants.js";

export const insertJobs = async (payload) => {
  console.log("Creating the job!");

  const MAKE_THE_JOB_QUERY_STRING = /* GraphQL */ `
    mutation insertJobs($objects: [${TABLE_NAME}_insert_input!]!) {
      result: insert_${TABLE_NAME}(objects: $objects) {
        affected_rows
        returning {
          id
        }
      }
    }
  `;
  // const MAKE_THE_JOB_QUERY = gql(MAKE_THE_JOB_QUERY_STRING);

  // Check if the job was taken by myself
  const result = await executeWithAdminRights(
    MAKE_THE_JOB_QUERY_STRING,
    undefined,
    {
      objects: [
        {
          status: "new",
          payload: {
            randomData: crypto.randomBytes(20).toString("hex"),
            pokemon: randomName(),
            ...payload,
          },
        },
      ],
    }
  );
  console.log(JSON.stringify(result, null, 2));

  return result;
};

const timerJobMaker = setInterval(() => {
  insertJobs({ timestamp: Date.now() });
}, 435);

insertJobs({ timestamp: Date.now() });

export default insertJobs;
