import * as iam from 'aws-cdk-lib/aws-iam';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface IamConstructProps {
  environment: string;
  externalID: string; // External ID for the trust policy
}

export class IamConstructStack extends Stack {
  constructor(scope: Construct, id: string, props: IamConstructProps) {
    super(scope, id);

    // Determine account number based on environment
    const accountNumber = props.environment === 'dev' ? '726510512353' : 'default-account-number';

    // Define the trust policy (assume role policy)
    const trustPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [
            new iam.ArnPrincipal(`arn:aws:iam:::${accountNumber}role/${props.environment}-aihouse-nuvista-ECS-Task-IAMrole`),
          ],
          actions: ['sts:AssumeRole'],
          conditions: {
            StringEquals: {
              'sts:ExternalId': `${props.externalID}`,
            },
          },
        }),
      ],
    });

    // Create the role
    const role = new iam.Role(this, 'MyCustomRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'), // Will be overridden below
      inlinePolicies: {
        MyInlinePolicy: new iam.PolicyDocument({
          statements: [
            // Existing S3 permissions
            new iam.PolicyStatement({
              actions: ['s3:GetObject', 's3:ListBucket'],
              resources: ['arn:aws:s3:::my-bucket', 'arn:aws:s3:::my-bucket/*'],
              effect: iam.Effect.ALLOW,
            }),
            // New policy statements
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['dynamodb:*', 'dynamodb:CreateTable'],
              resources: [
                'arn:aws:dynamodb:us-east-1:203918841130:table/Threads',
                'arn:aws:dynamodb:us-east-1:203918841130:table/*-aihouse-*',
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetBucketAcl',
                's3:GetObjectAcl',
                's3:PutBucketAcl',
                's3:ListBucket',
                's3:CreateBucket',
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:DeleteBucket',
              ],
              resources: ['arn:aws:s3:::dev-aihouse-kb', 'arn:aws:s3:::dev-aihouse-kb/*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['quicksight:*'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              sid: 'Statement1',
              effect: iam.Effect.ALLOW,
              actions: ['bedrock:*', 'bedrock:InvokeAgent'],
              resources: ['arn:aws:bedrock:us-east-1:203918841130:agent-alias/*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListAllMyBuckets'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:*'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['rds-db:connect'],
              resources: ['arn:aws:rds:us-east-1:203918841130:cluster:dev-aihouse'],
            }),
          ],
        }),
      },
    });

    // Override trust policy if needed
    (role.node.defaultChild as iam.CfnRole).assumeRolePolicyDocument = trustPolicy;
  }
}
