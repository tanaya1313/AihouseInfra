import * as cdk from 'aws-cdk-lib';
import { BedrockAgent } from '../constructs/bedrock-agent';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';

export class MyStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new BedrockAgent(this, 'MyBedrockAgent', {
      connectionString: 'https://your-index-1234567.svc.gcp-starter.pinecone.io',
      credentialsSecretArn: 'arn:aws:secretsmanager:your-region:123456789876:secret:your-key-name',
      textField: 'question',
      metadataField: 'metadata',
      embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
      instruction: 'Use this knowledge base to answer questions about books. It contains the full text of novels.',
      dataSourceName: 'books',
      chunkingStrategy: bedrock.ChunkingStrategy.FIXED_SIZE,
    });
  }
}