import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class BedrockAgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bedrockAgent = new cdk.CfnResource(this, 'BedrockAgent', {
      type: 'AWS::Bedrock::Agent',
      properties: {
        Name: 'MyBedrockAgent',
        Description: 'Agent for AI workflow',
        RoleArn: 'arn:aws:iam::123456789012:role/BedrockAgentRole',
        AutoPrepare: true, // Automatically prepares the agent
      },
    });

    // Optional: Define an alias for the agent
    new cdk.CfnResource(this, 'BedrockAgentAlias', {
      type: 'AWS::Bedrock::AgentAlias',
      properties: {
        AgentId: bedrockAgent.ref, // Referencing the agent
        AliasName: 'MyAgentAlias',
      },
    });
  }
}
