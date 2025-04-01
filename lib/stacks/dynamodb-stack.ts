import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ProvisionedDynamoTable } from '../constructs/dynamodb-table';

export class ETLStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new ProvisionedDynamoTable(this, 'ETLDataTable', {
      tableName: 'ETL-Processed-Data',
      readCapacity: 5,
      writeCapacity: 5,
      partitionKey: { name: 'ID', type: cdk.aws_dynamodb.AttributeType.STRING },
      sortKey: { name: 'Timestamp', type: cdk.aws_dynamodb.AttributeType.NUMBER },
    });
  }
}
