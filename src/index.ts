import dotenv from "dotenv";
import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import fs from "fs";
import http from "http";

dotenv.config();

const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;

if (!privateKeyPath || !appId || !webhookSecret) {
  throw new Error("required environment variables not set!");
}

const privateKey = fs.readFileSync(privateKeyPath, "utf8");

const app = new App({
  appId: appId,
  privateKey: privateKey,
  webhooks: {
    secret: webhookSecret,
  },
});

app.webhooks.on("pull_request.opened", async ({ octokit, payload }) => {
  console.log(
    `Received a pull request event for #${payload.pull_request.number}`
  );
  try {
    if (payload.pull_request.auto_merge !== null) {
      console.log(
        `Skipping ${payload.pull_request.html_url} (automerge already enabled).`
      );
      return;
    }

    if (payload.pull_request.user.type !== "Bot") {
      console.log(
        `Skipping ${payload.pull_request.html_url} (not opened by a bot).`
      );
      return;
    }

    // (The REST API doesn't support enabling automerge, so we have to use the
    // GraphQL API instead.)
    await octokit.graphql(
      `mutation MyMutation($pullRequestID: ID!) {
         enablePullRequestAutoMerge(input: {pullRequestId: $pullRequestID, mergeMethod: MERGE}) {
           clientMutationId
         }
       }`,
      { pullRequestID: payload.pull_request.node_id }
    );

    await octokit.rest.pulls.createReview({
      repo: payload.repository.name,
      pull_number: payload.pull_request.number,
      owner: payload.repository.owner.login,
      event: "APPROVE",
      body: "gu-automerge has been configured to automatically merge pull requests raised by bots for this repository. For more information, see: https://github.com/guardian/automerge.",
    });
  } catch (error) {
    console.error(error);

    if (error.response) {
      console.error(
        `Error! Status: ${error.response.status}. Message: ${error.response.data?.message}`
      );
    }
  }
});

app.webhooks.onError((error) => {
  if (error.name === "AggregateError") {
    console.error(`Error processing request: ${error.event}`);
  } else {
    console.error(error);
  }
});

const port = 3000;
const host = "localhost";
const path = "/api/webhook";
const localWebhookUrl = `http://${host}:${port}${path}`;

const middleware = createNodeMiddleware(app.webhooks, { path });

http.createServer(middleware).listen(port, () => {
  console.log(`Server is listening for events at: ${localWebhookUrl}`);
  console.log("Press Ctrl + C to quit.");
});
