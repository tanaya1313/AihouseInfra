#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AiHouseStack} from '../lib/stacks/AiHouseStack';



const app = new cdk.App();
new AiHouseStack(app, 'AiHouseStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT || 'default-account', 
    region: process.env.CDK_DEFAULT_REGION || 'default-region' 
  },
});
app.synth();