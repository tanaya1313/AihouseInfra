import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface CustomLambdaProps {
  functionName: string;
  codePath: string;
  handler: string;
  runtime?: lambda.Runtime; // Default to Node.js
  timeout?: cdk.Duration; // Default timeout
  iamRole?: iam.IRole; // 👈 Passing IAM Role instead of defining inside
}

export class CustomLambdaFunction extends Construct {
  public readonly lambdaFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: CustomLambdaProps) {
    super(scope, id);

    this.lambdaFunction = new lambda.Function(this, 'LambdaFunction', {
      functionName: props.functionName,
      code: lambda.Code.fromAsset(props.codePath),
      handler: props.handler,
      runtime: props.runtime ?? lambda.Runtime.NODEJS_18_X, // Default: Node.js 18
      timeout: props.timeout ?? cdk.Duration.seconds(30), // Default: 30s
      role: props.iamRole, // 👈 Role is passed externally, not defined here
    });
  }
}
