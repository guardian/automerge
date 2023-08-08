#!/bin/bash

set -e

#npm test
export AWS_PROFILE=deployTools
export AWS_REGION=eu-west-1

npm run build
aws s3 cp private-key.pem s3://${DIST_BUCKET}/deploy/PROD/automerge/private-key.pem
aws s3 cp dist/lambda.zip s3://${DIST_BUCKET}/deploy/PROD/automerge/lambda.zip

aws lambda update-function-code --function-name deploy-PROD-automerge --s3-bucket ${DIST_BUCKET} --s3-key deploy/PROD/automerge/lambda.zip
