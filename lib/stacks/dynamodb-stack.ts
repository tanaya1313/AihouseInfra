import * as cdk from 'aws-cdk-lib';
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ProvisionedDynamoTable } from '../constructs/dynamodb-table';

export class DynamoDBStack extends NestedStack {
  public readonly dashboardsTable: ProvisionedDynamoTable;
  public readonly knowledgeBaseTable: ProvisionedDynamoTable;

  constructor(scope: Construct, id: string, props?: NestedStackProps) {
    super(scope, id, props);

    // Create the dashboards table
    this.dashboardsTable = new ProvisionedDynamoTable(this, 'aihouse-dashboards-table', {
      tableName: 'aihouse-dashboards',
      readCapacity: 5,
      writeCapacity: 5,
      partitionKey: { name: 'tenantId', type: cdk.aws_dynamodb.AttributeType.STRING },
      sortKey: { name: 'dashboardId', type: cdk.aws_dynamodb.AttributeType.STRING },
    });

    // Create the knowledge base table
    this.knowledgeBaseTable = new ProvisionedDynamoTable(this, 'aihouse-knowledgeBase-table', {
      tableName: 'aihouse-knowledgeBase',
      readCapacity: 5,
      writeCapacity: 5,
      partitionKey: { name: 'tenantId', type: cdk.aws_dynamodb.AttributeType.STRING },
      sortKey: { name: 'kbId', type: cdk.aws_dynamodb.AttributeType.STRING },
    });

    // Export the table names
    new cdk.CfnOutput(this, 'DashboardsTableNameExport', {
      value: this.dashboardsTable.table.tableName,
      description: 'The name of the dashboards DynamoDB table',
      exportName: 'DashboardsTableName',
    });

    new cdk.CfnOutput(this, 'KnowledgeBaseTableNameExport', {
      value: this.knowledgeBaseTable.table.tableName,
      description: 'The name of the knowledge base DynamoDB table',
      exportName: 'KnowledgeBaseTableName',
    });
  }
}