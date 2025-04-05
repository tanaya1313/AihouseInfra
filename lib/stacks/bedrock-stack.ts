import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NestedStack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { pinecone, bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as uuid from 'uuid';

export class BedrockStack extends NestedStack {
  public readonly knowledgeBase: bedrock.VectorKnowledgeBase;
  public readonly dataSource: bedrock.S3DataSource;
  public readonly bucket: s3.Bucket;
  public readonly agent: bedrock.Agent;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create the Pinecone Vector Store
    const pineconeVectorStore = new pinecone.PineconeVectorStore({
      connectionString: 'https://your-index-1234567.svc.gcp-starter.pinecone.io',
      credentialsSecretArn: 'arn:aws:secretsmanager:your-region:123456789876:secret:your-key-name',
      textField: 'question',
      metadataField: 'metadata',
    });

    // Create the Knowledge Base
    this.knowledgeBase = new bedrock.VectorKnowledgeBase(this, 'KnowledgeBase', {
      vectorStore: pineconeVectorStore,
      embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
      instruction: 'Use this knowledge base to answer questions about books. It contains the full text of novels.',
    });

    // Create the S3 Bucket
    this.bucket = new s3.Bucket(this, 'DocBucket-' + uuid.v4(), {
      lifecycleRules: [
        {
          expiration: Duration.days(10),
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY, // Edit later if needed
      autoDeleteObjects: true, // Edit later if needed
    });

    // Create the S3 Data Source
    this.dataSource = new bedrock.S3DataSource(this, 'DataSource', {
      bucket: this.bucket,
      knowledgeBase: this.knowledgeBase,
      dataSourceName: 'books',
      chunkingStrategy: bedrock.ChunkingStrategy.FIXED_SIZE,
    });

    // Create the Bedrock Agent
    this.agent = new bedrock.Agent(this, 'Agent', {
      description: 'This is a knowledge base for books.',
      foundationModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
      instruction: 'Use this knowledge base to answer questions about books. It contains the full text of novels.',
      idleSessionTTL: Duration.minutes(10), // Edit later if needed
      knowledgeBases: [this.knowledgeBase],
      shouldPrepareAgent: true,
    });

    // Outputs for resources
    new cdk.CfnOutput(this, 'KnowledgeBaseId', {
      value: this.knowledgeBase.node.id,
      description: 'The ID of the Bedrock Knowledge Base',
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'The name of the S3 bucket used for the data source',
    });

    new cdk.CfnOutput(this, 'AgentId', {
      value: this.agent.node.id,
      description: 'The ID of the Bedrock Agent',
    });
  }
}
