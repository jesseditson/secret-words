import AWS from "aws-sdk";

const accessKeyId = process.env.AWS_KEY;
const secretAccessKey = process.env.AWS_SECRET;
// export const s3Bucket = process.env.S3_BUCKET
// export const dynamoTable = process.env.DYNAMO_TABLE

AWS.config.update({
  accessKeyId,
  secretAccessKey,
  signatureVersion: "v4",
  region: "us-west-2",
});

// export const s3 = new AWS.S3()

// export const dynamo = new AWS.DynamoDB.DocumentClient()
