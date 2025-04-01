import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { CustomLambdaFunction } from '../constructs/lambda-function';

export class ETLStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // IAM Role with necessary permissions
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Attach a basic policy (Modify as needed)
    lambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    );

    new CustomLambdaFunction(this, 'ETLProcessorLambda', {
      functionName: 'ETL-Processor',
      codePath: '../../resources/lambda/function1', // Path to your Lambda code
      handler: 'index.handler',
      timeout: cdk.Duration.minutes(1), // 1-minute timeout
      iamRole: lambdaRole, // 👈 Passing the IAM Role reference
    });
  }
}
