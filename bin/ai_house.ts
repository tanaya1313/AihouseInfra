#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AiHouseStack } from '../lib/ai_house-stack';

const app = new cdk.App();
new AiHouseStack(app, 'AiHouseStack');
