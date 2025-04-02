#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { S3Stack } from '../lib/stacks/s3-stack';
import { DynamoDBStack } from '../lib/stacks/dynamodb-stack';

const app = new cdk.App();

// new S3Stack(app, 's3-stack', {
//     env :{
//         account: process.env.CDK_DEFAULT_ACCOUNT, 
//         region: process.env.CDK_DEFAULT_REGION
//     }
// });

new DynamoDBStack(app, 'dynamodb-stack', {
    env :{
        account: process.env.CDK_DEFAULT_ACCOUNT, 
        region: process.env.CDK_DEFAULT_REGION
    }
});

app.synth();