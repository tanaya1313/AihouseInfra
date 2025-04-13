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


export class AiHouseStack extends cdk.Stack {
  public readonly dataBucket1: S3DataBucket;
  public readonly dataBucket2: S3DataBucket;
  public readonly dashboardsTable: ProvisionedDynamoTable;
  public readonly knowledgeBaseTable: ProvisionedDynamoTable;
  public readonly knowledgeBase: genAI.bedrock.VectorKnowledgeBase;
  public readonly dataSource: genAI.bedrock.S3DataSource;
  public readonly bucket: s3.Bucket;
  public readonly agent: genAI.bedrock.Agent;
  public readonly auroraDb: AuroraVectorStoreConstruct;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- CloudFormation Parameters ---

    const EnvironmentParam = new cdk.CfnParameter(this, 'Environment', {
      type: 'String',
      description: 'The environment for deployment.',
      noEcho: false, // Ensures the key is not displayed in the CloudFormation console
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






  // // --- Secrets Manager for Aurora credentials ---
  // const auroraSecret = new secretsmanager.Secret(this, 'AuroraSecret', {
  //   secretName: 'AuroraSecret',
  //   secretObjectValue: {
  //     username: cdk.SecretValue.unsafePlainText('aurora_user'),
  //     password: cdk.SecretValue.unsafePlainText('aurora_password'),
  //   },
  // });

    // --- Aurora Vector Store ---
    const auroraDb = new AuroraVectorStoreConstruct(this, 'VectorStore', {
      dbName: 'vectorstore',
      username: 'vectoruser',
      enableIamAuth: true,
      environment: EnvironmentParam.valueAsString,
    });

    // --- Bedrock Knowledge Base ---
    const knowledgeBaseRole = new iam.Role(this, 'KnowledgeBaseRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'),
      ],
    });

    const knowledgeBase = new cdk.aws_bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: 'KnowledgeBase',
      description: 'Knowledge base for Bedrock',
      vectorStore: {
        aurora: {
          clusterIdentifier: auroraDb.cluster.clusterIdentifier,
          databaseName: 'bedrock_vector_db',
          schemaName: 'bedrock_integration',
          tableName: 'bedrock_kb',
          vectorField: 'embedding',
          textField: 'chunks',
          metadataField: 'metadata',
          primaryKeyField: 'id',
          securityGroupIds: [auroraDb.securityGroup.securityGroupId],
          secretArn: auroraDb.secret.secretArn,
        },
      },
      embeddingsModel: 'amazon.titan-embed-text-v2',
      roleArn: knowledgeBaseRole.roleArn,
    });

    // --- S3 Bucket for Documents ---
    this.bucket = new s3.Bucket(this, 'DocBucket', {
      lifecycleRules: [{ expiration: Duration.days(100) }],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:ListBucket'],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
        principals: [new iam.ServicePrincipal('bedrock.amazonaws.com')],
      }),
    );

    // --- Bedrock S3 Data Source ---
    const dataSource = new cdk.aws_bedrock.CfnDataSource(this, 'DataSource', {
      name: 'DataSource',
      description: 'Data source for Bedrock',
      s3Config: {
        bucketName: this.bucket.bucketName,
        prefix: 'datasource/',
      },
      knowledgeBaseName: knowledgeBase.name,
    });

    // --- Bedrock Agent ---
    const agentRole = new iam.Role(this, 'AgentRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'),
      ],
    });

    new cdk.aws_bedrock.CfnAgent(this, 'Agent', {
      name: 'Agent',
      description: 'Bedrock agent to analyze Google Ads campaign data and provide actionable insights.',
      foundationModel: 'amazon.nova-lite-v1',
      instruction: 'Your role is to analyze Google Ads campaign data and generate insights that help optimize performance.',
      idleSessionTTLInSeconds: 600,
      knowledgeBaseNames: [knowledgeBase.name],
      roleArn: agentRole.roleArn,
    });
  }
}

    // --- Glue Setup ---
    const glueSetup = new GlueConstruct(this, 'GlueSetup', {
      s3Target: this.dataBucket2.bucket,
      databaseName: 'aihouse-database',
      crawlerName: 'aihouse-crawler',
    });

    // --- Athena Query Results Bucket ---
    const athenaBucket = new s3.Bucket(this, 'AthenaQueryResultsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true, // Recommended for Athena result buckets
    });

    // Allow Athena service to access the bucket directly
    athenaBucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowAthenaServiceAccess',
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('athena.amazonaws.com')],
      actions: [
        's3:GetBucketLocation',
        's3:GetObject',
        's3:ListBucket',
        's3:ListBucketMultipartUploads',
        's3:ListMultipartUploadParts',
        's3:AbortMultipartUpload',
        's3:PutObject',
        's3:DeleteObject',
      ],
      resources: [
        athenaBucket.bucketArn,
        `${athenaBucket.bucketArn}/*`,
      ],
    }));

    // --- QuickSight Role ---
    const quickSightRole = iam.Role.fromRoleName(
      this,
      'QuickSightServiceRole',
      'aws-quicksight-service-role-v0'
    );

    quickSightRole.attachInlinePolicy(
      new iam.Policy(this, 'QuickSightPolicy', {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              's3:GetObject',
              's3:ListBucket',
              's3:GetBucketLocation',
              's3:PutObject',
              's3:DeleteObject',
            ],
            resources: [
              athenaBucket.bucketArn,
              `${athenaBucket.bucketArn}/*`,
            ],
          }),
        ],
      })
    );

    // --- Athena Construct ---
    const athenaWorkspace = new AthenaConstruct(this, 'AthenaWorkspace', {
      resultBucket: athenaBucket,
      environment: EnvironmentParam.valueAsString,
    });
    athenaWorkspace.node.addDependency(athenaBucket);

    // --- QuickSight Construct ---
    const quickSight = new QuickSightAthenaConstruct(this, 'QuickSightAthena', {
      athenaWorkGroup: athenaWorkspace.workGroupName,
      environment: EnvironmentParam.valueAsString,
    });
    quickSight.node.addDependency(athenaWorkspace);
    quickSight.node.addDependency(glueSetup);
    quickSight.node.addDependency(athenaBucket);
  }
}