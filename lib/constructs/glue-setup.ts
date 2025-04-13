import { Construct } from 'constructs';
import { aws_glue as glue, aws_iam as iam, aws_s3 as s3, Aws } from 'aws-cdk-lib';

interface GlueConstructProps {
  s3Target: s3.IBucket;
  databaseName: string;
  crawlerName?: string;
}

export class GlueConstruct extends Construct {
  public readonly glueDatabase: glue.CfnDatabase;
  public readonly glueCrawler: glue.CfnCrawler;

  constructor(scope: Construct, id: string, props: GlueConstructProps) {
    super(scope, id);

    const { s3Target, databaseName, crawlerName } = props;

    // Glue Database
    this.glueDatabase = new glue.CfnDatabase(this, 'GlueDatabase', {
      catalogId: Aws.ACCOUNT_ID,
      databaseInput: {
        name: databaseName,
      },
    });

    // IAM Role for Crawler
    const glueCrawlerRole = new iam.Role(this, 'GlueCrawlerRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'),
      ],
    });

    // Allow crawler access to S3
    s3Target.grantRead(glueCrawlerRole);

    // Crawler definition
    this.glueCrawler = new glue.CfnCrawler(this, 'GlueCrawler', {
      name: crawlerName ?? `${id}-crawler`,
      role: glueCrawlerRole.roleArn,
      databaseName: this.glueDatabase.ref,
      targets: {
        s3Targets: [
          {
            path: `s3://${s3Target.bucketName}/processed/`, // update as needed
          },
        ],
      },
    });
  }
}
