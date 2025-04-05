#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { UnifiedStack } from './unifiedStack';

const app = new cdk.App();

new UnifiedStack(app, 'UnifiedSaaSStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
