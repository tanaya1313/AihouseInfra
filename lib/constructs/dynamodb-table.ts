import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface ProvisionedTableProps {
  tableName: string;
  readCapacity: number;
  writeCapacity: number;
  partitionKey: { name: string; type: dynamodb.AttributeType };
  sortKey?: { name: string; type: dynamodb.AttributeType };
  Environment: string;
}

export class ProvisionedDynamoTable extends Construct {
  public readonly table: dynamodb.Table;
  constructor(scope: Construct, id: string, props: ProvisionedTableProps) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'DynamoDBTable', {
      tableName:`${props.Environment}-${props.tableName}`,
      billingMode: dynamodb.BillingMode.PROVISIONED, // Using provisioned mode
      readCapacity: props.readCapacity,
      writeCapacity: props.writeCapacity,
      partitionKey: {
      name: props.partitionKey.name,
      type: props.partitionKey.type,
      },
      sortKey: props.sortKey
      ? {
        name: props.sortKey.name,
        type: props.sortKey.type,
        }
      : undefined,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    // this.tableName = this.table.tableName;
  }
}
