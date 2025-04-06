import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { S3DataBucket } from '../constructs/s3-bucket';
import { ProvisionedDynamoTable } from '../constructs/dynamodb-table';
import * as genAI from '@cdklabs/generative-ai-cdk-constructs';
import { v4 as uuid } from 'uuid';

export class CombinedInfraStack extends cdk.Stack {
  public readonly dataBucket1: S3DataBucket;
  public readonly dataBucket2: S3DataBucket;
  public readonly dashboardsTable: ProvisionedDynamoTable;
  public readonly knowledgeBaseTable: ProvisionedDynamoTable;
  public readonly knowledgeBase: genAI.bedrock.VectorKnowledgeBase;
  public readonly dataSource: genAI.bedrock.S3DataSource;
  public readonly bucket: s3.Bucket;
  public readonly agent: genAI.bedrock.Agent;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define a CloudFormation parameter for the Pinecone key
    const pineconeKeyParam = new cdk.CfnParameter(this, 'PineconeKey', {
      type: 'String',
      description: 'The API key for Pinecone.',
      noEcho: true, // Ensures the key is not displayed in the CloudFormation console
    });

    const uniqueId = uuid().split('-')[0];

    // --- S3 Buckets ---
    this.dataBucket1 = new S3DataBucket(this, `DataBucket1-${uniqueId}`, {
      bucketName: `raw-data-${uniqueId}`,
    });

    this.dataBucket2 = new S3DataBucket(this, `DataBucket2-${uniqueId}`, {
      bucketName: `processed-data-${uniqueId}`,
    });

    // --- DynamoDB Tables ---
    this.dashboardsTable = new ProvisionedDynamoTable(this, `DashboardsTable-${uniqueId}`, {
      tableName: `dashboards-${uniqueId}`,
      readCapacity: 5,
      writeCapacity: 5,
      partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'dashboardId', type: dynamodb.AttributeType.STRING },
    });

    this.knowledgeBaseTable = new ProvisionedDynamoTable(this, `KnowledgeBaseTable-${uniqueId}`, {
      tableName: `knowledgebase-${uniqueId}`,
      readCapacity: 5,
      writeCapacity: 5,
      partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'kbId', type: dynamodb.AttributeType.STRING },
    });

    // --- Secrets Manager ---
    const mySecret = new secretsmanager.Secret(this, `MySecret-${uniqueId}`, {
      secretName: `MySecret-${uniqueId}`,
      secretStringValue: cdk.SecretValue.unsafePlainText(pineconeKeyParam.valueAsString), // Use the parameter value
    });

    // --- Bedrock Agent ---
    const pineconeds = new genAI.pinecone.PineconeVectorStore({
      connectionString: 'dummy-pinecone-connection-string',
      credentialsSecretArn: mySecret.secretArn,
      textField: 'text',
      metadataField: 'metadata',
    });

    this.knowledgeBase = new genAI.bedrock.VectorKnowledgeBase(this, `KnowledgeBase-${uniqueId}`, {
      vectorStore: pineconeds,
      embeddingsModel: genAI.bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,
      instruction: 'Assist users with general queries and provide detailed responses about books available to purchase from amazon.',
    });

    this.bucket = new s3.Bucket(this, `DocBucket-${uniqueId}`, {
      lifecycleRules: [
        {
          expiration: Duration.days(10),
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.dataSource = new genAI.bedrock.S3DataSource(this, `DataSource-${uniqueId}`, {
      bucket: this.bucket,
      knowledgeBase: this.knowledgeBase,
      dataSourceName: `datasource-${uniqueId}`,
      chunkingStrategy: genAI.bedrock.ChunkingStrategy.FIXED_SIZE,
    });

    this.agent = new genAI.bedrock.Agent(this, `Agent-${uniqueId}`, {
      description: 'Dummy Bedrock agent for testing',
      foundationModel: genAI.bedrock.BedrockFoundationModel.ANTHROPIC_CLAUDE_INSTANT_V1_2,
      instruction: 'Assist with general queries about books available to purchase from amazon especially the ones in teenage fiction category.',
      idleSessionTTL: Duration.minutes(10),
      knowledgeBases: [this.knowledgeBase],
      shouldPrepareAgent: true,
    });
  }
}