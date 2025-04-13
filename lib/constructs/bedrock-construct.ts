import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { Environment } from 'aws-cdk-lib/aws-appconfig';

export interface BedrockKnowledgeBaseConstructProps {
  bucket: s3.IBucket; // Changed to IBucket for flexibility
  auroraCluster: rds.IDatabaseCluster;
  auroraSecretArn: string;
  auroraSecurityGroup: ec2.ISecurityGroup;
  databaseName?: string; // Optional: Allow customization
  tableName?: string; // Optional: Allow customization
  Environment: string; // Environment tag for resources
  bedrockRole: iam.IRole; // Role for Bedrock service
}

export class BedrockKnowledgeBaseConstruct extends Construct {
  public readonly knowledgeBase: bedrock.CfnKnowledgeBase; // Expose for downstream use

  constructor(scope: Construct, id: string, props: BedrockKnowledgeBaseConstructProps) {
    super(scope, id);
     
    // IAM Role for Bedrock Knowledge Base
    const bedrockRole = props.bedrockRole;

    // Grant specific permissions to the role
    bedrockRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock:CreateKnowledgeBase',
          'bedrock:UpdateKnowledgeBase',
          'bedrock:InvokeModel',
          'rds:DescribeDBClusters',
          'secretsmanager:GetSecretValue',
        ],
        resources: [
          props.auroraCluster.clusterArn,
          props.auroraSecretArn,
          'arn:aws:bedrock:*:*:foundation-model/amazon.titan-embed-text-v2',
        ],
      }),
    );

    // Knowledge Base
    this.knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'MyCfnKnowledgeBase', {
      name: 'MyKnowledgeBase',
      roleArn: bedrockRole.roleArn,
      
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: 'arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v1',
        },
      },
      storageConfiguration: {
        type: 'RDS',
        rdsConfiguration: {
          resourceArn: props.auroraCluster.clusterArn,
          databaseName: props.databaseName ?? 'bedrock_kb',
          tableName: props.tableName ?? 'vectors',
          credentialsSecretArn: props.auroraSecretArn,
          fieldMapping: {
            primaryKeyField: 'id',
            vectorField: 'vector',
            textField: 'text',
            metadataField: 'metadata',
          },
        },
      },
      description: 'Bedrock Knowledge Base with Aurora PostgreSQL',
      tags: {
        Environment: props.Environment, // Fixed the tag value
      },
    });

    // Data Source
    const dataSource = new bedrock.CfnDataSource(this, 'DataSource', {
      knowledgeBaseId: this.knowledgeBase.attrKnowledgeBaseId,
      name: 'ExistingS3DataSource',
      description: 'Existing S3 bucket as data source for Bedrock Knowledge Base',
      dataSourceConfiguration: {
        type: 'S3',
        s3Configuration: {
          bucketArn: props.bucket.bucketArn,
          inclusionPrefixes: ['datasource/'],
        },
      },
    });

    // Grant read access to the existing bucket for Bedrock
    props.bucket.grantRead(props.bedrockRole);

    // IAM Role for Bedrock Agent
    const agentRole = new iam.Role(this, 'AgentRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
    });

    // Bedrock Agent
    const agent = new bedrock.CfnAgent(this, 'Agent', {
      agentName: 'GoogleAdsAgent',
      description: 'Bedrock agent to analyze Google Ads campaign data and provide actionable insights.',
      foundationModel: 'nova-lite',
      instruction: 'Your role is to analyze Google Ads campaign data and generate insights that help optimize performance.',
      idleSessionTtlInSeconds: 600,
      knowledgeBases: [
        {
          description: 'Google Ads Knowledge Base',
          knowledgeBaseId: this.knowledgeBase.attrKnowledgeBaseId,
        },
      ],
      agentResourceRoleArn: agentRole.roleArn,
      tags: {
        Environment: props.Environment, // Fixed the tag value
      },
    });

    // Ensure Aurora security group allows Bedrock access
    props.auroraCluster.connections.allowFrom(
      new ec2.Connections({
        securityGroups: [props.auroraSecurityGroup],
      }),
      ec2.Port.tcp(5432),
      'Allow Bedrock to access Aurora PostgreSQL',
    );

    // Output Knowledge Base ID
    new cdk.CfnOutput(this, 'KnowledgeBaseId', {
      value: this.knowledgeBase.attrKnowledgeBaseId,
      description: 'Bedrock Knowledge Base ID',
    });
  }
}
