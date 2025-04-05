import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DynamoDBStack } from '../lib/stacks/dynamodb-stack';
import { S3Stack } from '../lib/stacks/s3-stack';
import { BedrockStack } from '../lib/stacks/bedrock-stack';

export class UnifiedStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const dynamo = new DynamoDBStack(this, 'NestedDynamoDB');
    const s3 = new S3Stack(this, 'NestedS3');
    const bedrock = new BedrockStack(this, 'NestedBedrock');

    // Add dependencies if necessary
    bedrock.addDependency(dynamo);
    bedrock.addDependency(s3);
  }
}
