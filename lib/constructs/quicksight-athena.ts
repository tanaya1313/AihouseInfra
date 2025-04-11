import { Construct } from 'constructs';
import { CfnDataSource } from 'aws-cdk-lib/aws-quicksight';
import { Stack } from 'aws-cdk-lib';

interface QuickSightAthenaProps {
  environment: string;
  athenaWorkGroup: string;
}

export class QuickSightAthenaConstruct extends Construct {
  constructor(scope: Construct, id: string, props: QuickSightAthenaProps) {
    super(scope, id);

    const awsAccountId = Stack.of(this).account;
    const region = Stack.of(this).region;
    const dataSourceName = `${props.environment}-athena-ds`;

    new CfnDataSource(this, 'QuickSightAthenaDataSource', {
      awsAccountId,
      dataSourceId: dataSourceName,
      name: dataSourceName,
      type: 'ATHENA',
      dataSourceParameters: {
        athenaParameters: {
          workGroup: props.athenaWorkGroup,
        },
      },
      permissions: [
        {
          principal: `arn:aws:quicksight:${region}:${awsAccountId}:user/default/tanayas728@gmail.com`,
          actions: [
            'quicksight:DescribeDataSource',
            'quicksight:DescribeDataSourcePermissions',
            'quicksight:PassDataSource',
            'quicksight:UpdateDataSource',
            'quicksight:DeleteDataSource',
            'quicksight:UpdateDataSourcePermissions',
          ],
        },
      ],
    });
  }
}
