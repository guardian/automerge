import dotenv from "dotenv";
import { App } from "octokit";
import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

dotenv.config();

const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyBucket = process.env.PRIVATE_KEY_BUCKET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;

if (!privateKeyBucket || !privateKeyPath || !appId || !webhookSecret) {
  throw new Error("required environment variables not set!");
}

const s3Client = new S3Client({ region: "eu-west-1" });
const resp = await s3Client.send(
  new GetObjectCommand({
    Bucket: privateKeyBucket,
    Key: privateKeyPath,
  })
);
const privateKey = await resp.Body?.transformToString("utf8");
if (privateKey === undefined) {
  throw new Error("private key not found");
}

const app = new App({
  appId: appId,
  privateKey: privateKey,
  webhooks: {
    secret: webhookSecret,
  },
});

app.webhooks.on("pull_request.opened", async ({ payload, octokit }) => {
  console.log(
    `Received a pull request event for #${payload.pull_request.number}`
  );

  const now = new Date();
  if (now.getHours() < 9 || now.getHours() > 17) {
    console.log(
      `Skipping ${payload.pull_request.html_url} (invoked outside of working hours: 9-5).`
    );
    return;
  }

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
});

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${event.headers["x-github-delivery"]}`);

  return app.webhooks
    .verifyAndReceive({
      id: event.headers["x-github-delivery"] as string,
      name: event.headers["x-github-event"] as any,
      payload: event.body as string,
      signature: event.headers["x-hub-signature-256"] as string,
    })
    .catch((error) => {
      console.error(error);
    })
    .then(() => {
      return {
        statusCode: 202,
        body: "Processing request",
      };
    });
};
