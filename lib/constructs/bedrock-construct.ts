// bedrock-kb-construct.ts
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface BedrockKnowledgeBaseConstructProps {
  bucket: s3.Bucket;
  auroraCluster: rds.IDatabaseCluster;
  auroraSecretArn: string;
  auroraSecurityGroup: ec2.ISecurityGroup;
}

export class BedrockKnowledgeBaseConstruct extends Construct {
  constructor(scope: Construct, id: string, props: BedrockKnowledgeBaseConstructProps) {
    super(scope, id);

    // IAM Role for KB
    const knowledgeBaseRole = new iam.Role(this, 'KnowledgeBaseRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'),
      ],
    });

    // Knowledge Base
    const knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: 'KnowledgeBase',
      description: 'Knowledge base for Bedrock',
      vectorStore: {
        aurora: {
          clusterIdentifier: props.auroraCluster.clusterIdentifier,
          databaseName: 'bedrock_vector_db',
          schemaName: 'bedrock_integration',
          tableName: 'bedrock_kb',
          vectorField: 'embedding',
          textField: 'chunks',
          metadataField: 'metadata',
          primaryKeyField: 'id',
          securityGroupIds: [props.auroraSecurityGroup.securityGroupId],
          secretArn: props.auroraSecretArn,
        },
      },
      embeddingsModel: 'amazon.titan-embed-text-v2',
      roleArn: knowledgeBaseRole.roleArn,
    });

    // Data source
    new bedrock.CfnDataSource(this, 'DataSource', {
      name: 'DataSource',
      description: 'Data source for Bedrock',
      knowledgeBaseName: knowledgeBase.name,
      s3Config: {
        bucketName: props.bucket.bucketName,
        prefix: 'datasource/',
      },
    });

    // Bedrock Agent
    const agentRole = new iam.Role(this, 'AgentRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'),
      ],
    });

    new bedrock.CfnAgent(this, 'Agent', {
      name: 'Agent',
      description: 'Bedrock agent to analyze Google Ads campaign data and provide actionable insights.',
      foundationModel: 'amazon.nova-lite-v1',
      instruction: 'Your role is to analyze Google Ads campaign data and generate insights that help optimize performance.',
      idleSessionTTLInSeconds: 600,
      knowledgeBaseNames: [knowledgeBase.name],
      roleArn: agentRole.roleArn,
    });

    // Grant S3 access to Bedrock
    props.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:ListBucket'],
        resources: [props.bucket.bucketArn, `${props.bucket.bucketArn}/*`],
        principals: [new iam.ServicePrincipal('bedrock.amazonaws.com')],
      }),
    );
  }
}
