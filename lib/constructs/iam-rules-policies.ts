import * as iam from 'aws-cdk-lib/aws-iam';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface IamConstructProps {
  environment: string;
  externalID: string; // External ID for the trust policy
  principalRoleArn: string; // New prop for the principal ARN
  auroraClusterArn?: string; // Optional: For Bedrock Aurora integration
  s3BucketName?: string; // Optional: For Bedrock S3 data source
  auroraSecretArn?: string; // Optional: For Bedrock Secrets Manager
}

export class IamConstructStack extends Construct {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: IamConstructProps) {
    super(scope, id);

    // Validate principal ARN format
    if (!props.principalRoleArn.match(/^arn:aws:iam::\d{12}:role\/[a-zA-Z0-9-_\/]+$/)) {
      throw new Error(`Invalid principalRoleArn: ${props.principalRoleArn}`);
    }

    // Define the trust policy
    const trustPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [new iam.ArnPrincipal(props.principalRoleArn)],
          actions: ['sts:AssumeRole'],
          conditions: {
            StringEquals: {
              'sts:ExternalId': props.externalID,
            },
          },
        }),
        // Add Bedrock service principal for Knowledge Base/Agent
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [new iam.ServicePrincipal('bedrock.amazonaws.com')],
          actions: ['sts:AssumeRole'],
        }),
      ],
    });

    // Create the role
    this.role = new iam.Role(this, 'aihouse-cross-account-role', {
      roleName: `${props.environment}-aihouse-cross-account-role`,
      assumedBy: new iam.CompositePrincipal(
        new iam.ArnPrincipal(props.principalRoleArn),
        new iam.ServicePrincipal('bedrock.amazonaws.com')
      ), // Initial trust, will be overridden
      inlinePolicies: {
        CrossAccountPolicy: new iam.PolicyDocument({
          statements: [
            // DynamoDB permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['dynamodb:*', 'dynamodb:CreateTable'],
              resources: [
                `arn:aws:dynamodb:${Stack.of(this).region}:${Stack.of(this).account}:table/Threads`,
                `arn:aws:dynamodb:${Stack.of(this).region}:${Stack.of(this).account}:table/*-aihouse-*`,
              ],
            }),
            // S3 permissions
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
              resources: props.s3BucketName
                ? [
                    `arn:aws:s3:::${props.s3BucketName}`,
                    `arn:aws:s3:::${props.s3BucketName}/*`,
                  ]
                : [
                    `arn:aws:s3:::${props.environment}-aihouse-kb`,
                    `arn:aws:s3:::${props.environment}-aihouse-kb/*`,
                  ],
            }),
            // Bedrock permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:Retrieve',
                'bedrock:RetrieveAndGenerate',
                'bedrock:CreateKnowledgeBase',
                'bedrock:UpdateKnowledgeBase',
              ],
              resources: [
                `arn:aws:bedrock:${Stack.of(this).region}:${Stack.of(this).account}:knowledge-base/*`,
                `arn:aws:bedrock:${Stack.of(this).region}::foundation-model/amazon.titan-embed-text-v2`,
                `arn:aws:bedrock:${Stack.of(this).region}::foundation-model/amazon.nova-lite`,
              ],
            }),
            // RDS permissions (for Aurora PostgreSQL)
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'rds:DescribeDBClusters', // Allow describing Aurora clusters
                'rds-data:ExecuteStatement',
                'rds-data:BatchExecuteStatement',
                'rds-db:connect',
              ],
              resources: props.auroraClusterArn
                ? [props.auroraClusterArn] // Use the provided Aurora cluster ARN
                : [`arn:aws:rds:${Stack.of(this).region}:${Stack.of(this).account}:cluster:${props.environment}-bedrock-kb-cluster`], // Fallback to a default ARN
            }),
            // Secrets Manager permissions (for Aurora credentials)
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['secretsmanager:GetSecretValue'],
              resources: props.auroraSecretArn
                ? [props.auroraSecretArn]
                : ['*'], // Fallback; specify ARN for security
            }),
            // Scoped QuickSight permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'quicksight:Describe*',
                'quicksight:List*',
                'quicksight:Get*',
                'quicksight:CreateDashboard',
                'quicksight:UpdateDashboard',
              ],
              resources: ['*'],
            }),
            // Scoped Lambda permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction', 'lambda:GetFunction', 'lambda:CreateFunction'],
              resources: [`arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:*-aihouse-*`],
            }),
            // S3 bucket listing (scoped)
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListAllMyBuckets'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Apply trust policy
    (this.role.node.defaultChild as iam.CfnRole).assumeRolePolicyDocument = trustPolicy;
  }
}
