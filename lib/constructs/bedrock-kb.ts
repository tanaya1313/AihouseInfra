import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { pinecone, bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as uuid from 'uuid';

interface BedrockAgentProps {
  connectionString: string;
  credentialsSecretArn: string;
  textField: string;
  metadataField: string;
  embeddingsModel: bedrock.BedrockFoundationModel;
  instruction: string;
  dataSourceName: string;
  chunkingStrategy: bedrock.ChunkingStrategy;
  foundationModel: bedrock.BedrockFoundationModel;
  description?: string;
  
}

export class BedrockAgent extends Construct {
  public readonly knowledgeBase: bedrock.VectorKnowledgeBase;
  public readonly dataSource: bedrock.S3DataSource;
  public readonly bucket: s3.Bucket;
  public readonly agent: bedrock.Agent;

  constructor(scope: Construct, id: string, props: BedrockAgentProps) {
    super(scope, id);

    // Create the Pinecone Vector Store
    // const pineconeds = new pinecone.PineconeVectorStore({
    //   connectionString: props.connectionString,
    //   credentialsSecretArn: props.credentialsSecretArn,
    //   textField: props.textField,
    //   metadataField: props.metadataField,
    // });

    // // Create the Knowledge Base
    // this.knowledgeBase = new bedrock.VectorKnowledgeBase(this, 'KnowledgeBase', {
    //   vectorStore: pineconeds,
    //   embeddingsModel: props.embeddingsModel,
    //   instruction: props.instruction,
    // });

   
    /** S3 bucket for Bedrock data source */
    // this.bucket = new s3.Bucket(this, 'DocBucket-' + uuid.v4(), {
    //   lifecycleRules: [
    //     {
    //       expiration: Duration.days(10),
    //     },
    //   ],
    //   blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    //   encryption: s3.BucketEncryption.S3_MANAGED,
    //   enforceSSL: true,
    //   removalPolicy: RemovalPolicy.DESTROY,  // edit later
    //   autoDeleteObjects: true,  //edit later
    // });

    // //the S3 Data Source
    // this.dataSource = new bedrock.S3DataSource(this, 'DataSource', {
    //   bucket: this.bucket,
    //   knowledgeBase: this.knowledgeBase,
    //   dataSourceName: props.dataSourceName,
    //   chunkingStrategy: props.chunkingStrategy,
    // });

   // br agent 
    // this.agent = new bedrock.Agent(this, 'Agent', {
    //   description :props.description,
    //   foundationModel: props.foundationModel,
    //   instruction: props.instruction,
    //   idleSessionTTL: Duration.minutes(10), //edit it later
    //   knowledgeBases: [this.knowledgeBase],
    //   shouldPrepareAgent: true,
    // });
  }
}