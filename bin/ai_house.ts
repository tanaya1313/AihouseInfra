#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { S3BucketStack } from '../lib/stacks/s3-stack';

const app = new cdk.App();

new S3BucketStack(app, 's3-stack', {
    env :{
        account: process.env.CDK_DEFAULT_ACCOUNT, 
        region: process.env.CDK_DEFAULT_REGION
    }
});