import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { pinecone, bedrock } from '@cdklabs/generative-ai-cdk-constructs';

interface BedrockAgentProps {
  connectionString: string;
  credentialsSecretArn: string;
  textField: string;
  metadataField: string;
  embeddingsModel: bedrock.BedrockFoundationModel;
  instruction: string;
  dataSourceName: string;
  chunkingStrategy: bedrock.ChunkingStrategy;
}

export class BedrockAgent extends Construct {
  public readonly knowledgeBase: bedrock.VectorKnowledgeBase;
  public readonly dataSource: bedrock.S3DataSource;
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: BedrockAgentProps) {
    super(scope, id);

    // Create the Pinecone Vector Store
    const pineconeds = new pinecone.PineconeVectorStore({
      connectionString: props.connectionString,
      credentialsSecretArn: props.credentialsSecretArn,
      textField: props.textField,
      metadataField: props.metadataField,
    });

    // Create the Knowledge Base
    this.knowledgeBase = new bedrock.VectorKnowledgeBase(this, 'KnowledgeBase', {
      vectorStore: pineconeds,
      embeddingsModel: props.embeddingsModel,
      instruction: props.instruction,
    });

    // Create the S3 Bucket
    this.bucket = new s3.Bucket(this, 'DocBucket');

    // Create the S3 Data Source
    this.dataSource = new bedrock.S3DataSource(this, 'DataSource', {
      bucket: this.bucket,
      knowledgeBase: this.knowledgeBase,
      dataSourceName: props.dataSourceName,
      chunkingStrategy: props.chunkingStrategy,
    });
  }
}