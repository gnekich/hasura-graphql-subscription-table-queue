/*
    Author: Gordan Nekić
    Proof of concept for a job queue using Hasura and NodeJS.
    This is a simple implementation of a job queue using Hasura
    and NodeJS. The idea is to have a table in Hasura that will
    store the jobs to be executed. The jobs will be executed by
    a worker that will be listening to the table.
*/
// --------------------------------------------------------------------------------
import "dotenv/config";
import crypto from "crypto";
// --------------------------------------------------------------------------------
// Subscription part
import { createSubscriptionObservable } from "./subscriber.js";
import {
  HASURA_GRAPHQL_API_ENDPOINT,
  HASURA_GRAPHQL_ADMIN_SECRET,
  TABLE_NAME,
} from "./utils/constants.js";
// import "./jobMaker.js";
import "./jobRescheduler.js";
import "./jobCleaner.js";
import { delay } from "./utils/delay.js";
import { takeTheJob } from "./takeTheJob.js";
import { updateKeepAlive } from "./updateKeepAlive.js";
import { completeTheJob } from "./completeTheJob.js";
// --------------------------------------------------------------------------------
// Clear the console with special char
console.log("\x1Bc");
// --------------------------------------------------------------------------------
// Generate uuid using crypto
const workerId = crypto.randomUUID();
console.log(`Worker id: ${workerId}`);
const hashOfUuid = crypto.createHash("sha256").update(workerId).digest("hex");
const shortHashOfUuid = hashOfUuid.slice(0, 10);
const shortHashOfUuidInt = parseInt(shortHashOfUuid, 16);
// console.log(`Worker hash of id: ${hashOfUuid} (${shortHashOfUuid})`);
console.log(
  `Worker short hash of id: ${shortHashOfUuid} ${shortHashOfUuidInt} ${
    shortHashOfUuidInt % 3500
  }`
);
// --------------------------------------------------------------------------------
const getRandomNumberBasedOnSeed = (seed) => {
  return parseInt(
    crypto.createHash("sha256").update(seed).digest("hex").slice(0, 10),
    16
  );
};
const getPseudoRandomSeed = () => {
  return `${workerId}:${crypto.randomBytes(20).toString("hex")}`;
};
// --------------------------------------------------------------------------------

let jobs = [];

// Set the job processor...
let processing;

// Processing using setTimeout and recursion
let timer;
const singleTick = () => {
  return setTimeout(async () => {
    if (processing) {
      timer = singleTick();
      return;
    }
    // Find the random index of job to process based on first 8 bytes of hashOfUuid
    const randomNumberBasedOnSeed = getRandomNumberBasedOnSeed(
      getPseudoRandomSeed()
    );
    const randomIndex = randomNumberBasedOnSeed % jobs.length; // On length of jobs 0 it will be NaN
    // console.log(`Random index: ${randomIndex} ${jobs.length}`);
    if (typeof jobs?.[randomIndex]?.id !== "string") {
      timer = singleTick();
      return;
    }
    processing = jobs?.[randomIndex]?.id;
    console.log(
      `Based on my hash:${shortHashOfUuid}, I will try to process this job id: ${processing} by index ${randomIndex}`
    );
    const deplayBasedOnMyHashAndJobId =
      parseInt(
        crypto
          .createHash("sha256")
          .update(`${workerId}:${processing}`)
          .digest("hex")
          .slice(0, 10),
        16
      ) % 1500;
    console.log(`Delaying lazy job taking: ${deplayBasedOnMyHashAndJobId}`);
    await delay(deplayBasedOnMyHashAndJobId);

    // Check if the job is still available
    // If not, skip it and try again
    const randomNumberBasedOnSeed2ndTry = getRandomNumberBasedOnSeed(
      getPseudoRandomSeed()
    );
    const randomIndexAfterLazyWait =
      randomNumberBasedOnSeed2ndTry % jobs.length; // On length of jobs 0 it will be NaN
    if (typeof jobs?.[randomIndexAfterLazyWait]?.id !== "string") {
      console.log("Job is not available anymore! Jobs list changed.");
      timer = singleTick();
      processing = undefined;
      return;
    }
    processing = jobs?.[randomIndexAfterLazyWait]?.id;

    const resultOfAck = await takeTheJob(processing, workerId); // ACK
    // If acks fails we can reset the processing variable
    if (resultOfAck?.data?.result?.affected_rows === 1) {
      console.log(`Actually processing job! ${processing}`);
      const payload = resultOfAck?.data?.result?.returning?.[0]?.payload ?? {};
      console.log(`Job payload: ${payload?.pokemon}`);
      await delay(
        5000 + (getRandomNumberBasedOnSeed(getPseudoRandomSeed()) % 5000)
      );
      await completeTheJob(processing, workerId, "completed", {
        result: "This is the result after processing!",
        pokemonNameReversed: payload?.pokemon?.split("")?.reverse()?.join(""),
      }); // Finish
    } else {
      console.log(
        `Skipping this job id ${processing} other worker probably got it.`
      );
      // Drop this id from jobs list
      jobs = jobs.filter((job) => job.id !== processing);
    }

    processing = undefined;
    timer = singleTick();
  }, 50);
};

// ---
timer = singleTick();

const timerKeepAlive = setInterval(async () => {
  if (processing) {
    // console.log(`Keep alive! ${processing} Processing...`);
    updateKeepAlive(processing, workerId);
  }
}, 3000);

// Start the listener for the jobs...
try {
  const SUBSCRIBE_QUERY_STRING = /* GraphQL */ `
    subscription getJobs {
      result: ${TABLE_NAME}(
        where: {
          _or: [
            { status: { _eq: "new" } }
            #{ status: { _eq: "progress" } }
          ]
          worker_id: { _is_null: true }
        }
        order_by: { created_at: desc }
        limit: 100
      ) {
        id
        status
        worker_id
        #last_processed_at
        created_at
        updated_at
      }
    }
  `;
  // Create new subscriber
  const subscriptionClient = createSubscriptionObservable(
    HASURA_GRAPHQL_API_ENDPOINT, // GraphQL endpoint
    {
      "x-hasura-admin-secret": HASURA_GRAPHQL_ADMIN_SECRET,
    },
    SUBSCRIBE_QUERY_STRING,
    {
      // query: {}
    }
  );

  let consumer;
  let listenerReady = false;

  const reSubscribe = () => {
    console.log("Subscribing...");
    consumer?.unsubscribe();
    consumer = subscriptionClient.subscribe(
      (eventData) => {
        //console.log(JSON.stringify(eventData, null, 2));
        // Set the value of the jobs to the received value...
        jobs = eventData?.data?.result ?? [];
        // Do something on receipt of the event
        console.log(
          `Received event! Updating the local worker jobs list... ${jobs.length}`
        );
      },
      (err) => {
        console.log("Err");
        console.log(err);
        listenerReady = false;
        console.log(`listenerReady: ${listenerReady}`);
        setTimeout(() => {
          reSubscribe();
        }, 1000);
      },
      () => {
        listenerReady = true;
        console.log(`listenerReady: ${listenerReady}`);
      }
    );
  };
  reSubscribe();
} catch (error) {
  console.error(error);
  console.error("Can't subscribe.");
}
// --------------------------------------------------------------------------------
// Here be dragons!
