import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { S3DataBucket } from '../constructs/s3-bucket';
import { ProvisionedDynamoTable } from '../constructs/dynamodb-table';
import * as genAI from '@cdklabs/generative-ai-cdk-constructs';
import { AthenaConstruct } from '../constructs/athena-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { GlueConstruct } from '../constructs/glue-setup';
import { QuickSightAthenaConstruct } from '../constructs/quicksight-athena';
import { AuroraVectorStoreConstruct } from '../constructs/aurora-postgres';
import { BedrockKnowledgeBaseConstruct } from '../constructs/bedrock-construct';
import { IamConstructStack } from '../constructs/iam-rules-policies';


export class AiHouseStack extends cdk.Stack {
  public readonly dataBucket1: S3DataBucket;
  public readonly dataBucket2: S3DataBucket;
  public readonly dashboardsTable: ProvisionedDynamoTable;
  public readonly knowledgeBaseTable: ProvisionedDynamoTable;
  public readonly BedrockAgent:BedrockKnowledgeBaseConstruct; 
  public readonly bucket: s3.Bucket;
  public readonly auroraDb: AuroraVectorStoreConstruct;
  public readonly IamRole: IamConstructStack;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- CloudFormation Parameters ---

    const EnvironmentParam = new cdk.CfnParameter(this, 'Environment', {
      type: 'String',
      description: 'The environment for deployment.',
      noEcho: false, // Ensures the key is not displayed in the CloudFormation console
    });

    // --- IAM Role  ---
    this.IamRole = new IamConstructStack(this, 'IamConstruct', {
      environment: EnvironmentParam.valueAsString,
      externalID: 'your-external-id',
      principalRoleArn: 'arn:aws:iam::726510512353:role/dev-aihouse-nuvista-ECS-Task-IAMrole', // Your actual role ARN

    });


    // --- S3 Buckets ---
    this.dataBucket1 = new S3DataBucket(this, 'DataBucket1', {
      bucketName: 'raw-data',
      environment: EnvironmentParam.valueAsString,
    });

    this.dataBucket2 = new S3DataBucket(this, 'DataBucket2', {
      bucketName: 'processed-data',
      environment: EnvironmentParam.valueAsString,
    });

    // --- DynamoDB Tables ---
    this.dashboardsTable = new ProvisionedDynamoTable(this, 'DashboardsTable', {
      tableName: 'threads',
      readCapacity: 5,
      writeCapacity: 5,
      partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'dashboardId', type: dynamodb.AttributeType.STRING },
      Environment: EnvironmentParam.valueAsString,
    });

  




  // //--- Bedrock Knowledge Base and Agent---
  this.auroraDb = new AuroraVectorStoreConstruct(this, 'AuroraVectorStore', {
    dbName: `${EnvironmentParam.valueAsString}-aihouse-db`,
    username: 'BedrockUser',
    enableIamAuth: true,
    environment: EnvironmentParam.valueAsString,
  });
  // this.BedrockAgent= new BedrockKnowledgeBaseConstruct(this, 'BedrockKnowledgeBase', {
  //   bucket: this.dataBucket1.bucket,
  //   auroraCluster: this.auroraDb.cluster,
  //   auroraSecretArn: this.auroraDb.secret.secretArn,
  //   auroraSecurityGroup: this.auroraDb.securityGroup,
  //   databaseName: 'bedrock_kb',
  //   tableName: 'knowledge_base',
  //   Environment: EnvironmentParam.valueAsString,
  //   bedrockRole: this.IamRole.role,
  // });

  // this.BedrockAgent.node.addDependency(this.auroraDb.cluster);
  // this.BedrockAgent.node.addDependency(this.auroraDb.lambdaFunction);
  

   
    

  //   // --- Glue Setup ---
  //   const glueSetup = new GlueConstruct(this, 'GlueSetup', {
  //     s3Target: this.dataBucket2.bucket,
  //     databaseName: 'aihouse-database',
  //     crawlerName: 'aihouse-crawler',
  //   });

  //   // --- Athena Query Results Bucket ---
  //   const athenaBucket = new s3.Bucket(this, 'AthenaQueryResultsBucket', {
  //     removalPolicy: cdk.RemovalPolicy.DESTROY,
  //     blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  //     versioned: true, // Recommended for Athena result buckets
  //   });

  //   // Allow Athena service to access the bucket directly
  //   athenaBucket.addToResourcePolicy(new iam.PolicyStatement({
  //     sid: 'AllowAthenaServiceAccess',
  //     effect: iam.Effect.ALLOW,
  //     principals: [new iam.ServicePrincipal('athena.amazonaws.com')],
  //     actions: [
  //       's3:GetBucketLocation',
  //       's3:GetObject',
  //       's3:ListBucket',
  //       's3:ListBucketMultipartUploads',
  //       's3:ListMultipartUploadParts',
  //       's3:AbortMultipartUpload',
  //       's3:PutObject',
  //       's3:DeleteObject',
  //     ],
  //     resources: [
  //       athenaBucket.bucketArn,
  //       `${athenaBucket.bucketArn}/*`,
  //     ],
  //   }));

  //   // --- QuickSight Role ---
  //   const quickSightRole = iam.Role.fromRoleName(
  //     this,
  //     'QuickSightServiceRole',
  //     'aws-quicksight-service-role-v0'
  //   );

  //   quickSightRole.attachInlinePolicy(
  //     new iam.Policy(this, 'QuickSightPolicy', {
  //       statements: [
  //         new iam.PolicyStatement({
  //           effect: iam.Effect.ALLOW,
  //           actions: [
  //             's3:GetObject',
  //             's3:ListBucket',
  //             's3:GetBucketLocation',
  //             's3:PutObject',
  //             's3:DeleteObject',
  //           ],
  //           resources: [
  //             athenaBucket.bucketArn,
  //             `${athenaBucket.bucketArn}/*`,
  //           ],
  //         }),
  //       ],
  //     })
  //   );

  //   // --- Athena Construct ---
  //   const athenaWorkspace = new AthenaConstruct(this, 'AthenaWorkspace', {
  //     resultBucket: athenaBucket,
  //     environment: EnvironmentParam.valueAsString,
  //   });
  //   athenaWorkspace.node.addDependency(athenaBucket);

  //   // --- QuickSight Construct ---
  //   const quickSight = new QuickSightAthenaConstruct(this, 'QuickSightAthena', {
  //     athenaWorkGroup: athenaWorkspace.workGroupName,
  //     environment: EnvironmentParam.valueAsString,
  //   });
  //   quickSight.node.addDependency(athenaWorkspace);
  //   quickSight.node.addDependency(glueSetup);
  //   quickSight.node.addDependency(athenaBucket);
  }
}