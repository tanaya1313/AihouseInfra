#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CombinedInfraStack } from '../lib/stacks/combined-infra-stack';



const app = new cdk.App();
new CombinedInfraStack(app, 'CombinedInfraStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT || 'default-account', 
    region: process.env.CDK_DEFAULT_REGION || 'default-region' 
  },
});
app.synth();