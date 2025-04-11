import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as athena from 'aws-cdk-lib/aws-athena';

interface AthenaConstructProps {
    environment: string;
    resultBucket: s3.Bucket;
}

export class AthenaConstruct extends Construct {
    public readonly workGroupName: string;
    public readonly workGroupRole: iam.Role;

    constructor(scope: Construct, id: string, props: AthenaConstructProps) {
        super(scope, id);

        // Create IAM role for the Athena workgroup
        this.workGroupRole = new iam.Role(this, 'AthenaWorkGroupRole', {
            assumedBy: new iam.ServicePrincipal('athena.amazonaws.com'),
            description: `IAM role for ${props.environment} Athena workgroup`,
        });

        // OPTIONAL: Allow QuickSight to assume the Athena execution role
        this.workGroupRole.assumeRolePolicy?.addStatements(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                principals: [new iam.ServicePrincipal('quicksight.amazonaws.com')],
                actions: ['sts:AssumeRole'],
            })
        );

        // Add AmazonAthenaFullAccess managed policy
        this.workGroupRole.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonAthenaFullAccess')
        );

        // Add explicit permissions for S3 result bucket
        this.workGroupRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    's3:GetBucketLocation',
                    's3:GetObject',
                    's3:ListBucket',
                    's3:ListBucketMultipartUploads',
                    's3:ListMultipartUploadParts',
                    's3:AbortMultipartUpload',
                    's3:PutObject',
                    's3:DeleteObject',
                ],
                resources: [
                    props.resultBucket.bucketArn,
                    `${props.resultBucket.bucketArn}/*`,
                ],
            })
        );

        // Add Glue Data Catalog permissions (if used in queries)
        this.workGroupRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'glue:GetDatabase',
                    'glue:GetDatabases',
                    'glue:GetTable',
                    'glue:GetTables',
                    'glue:GetPartition',
                    'glue:GetPartitions',
                ],
                resources: ['*'], // Optionally scope to specific Glue resources
            })
        );

        // Create the Athena WorkGroup with the execution role
        const workGroup = new athena.CfnWorkGroup(this, 'WorkGroup', {
            name: `${props.environment}-aihouse-quicksight-wg`,
            state: 'ENABLED',
            workGroupConfiguration: {
                resultConfiguration: {
                    outputLocation: `s3://${props.resultBucket.bucketName}/athena-results/`,
                },
                enforceWorkGroupConfiguration: true,
                publishCloudWatchMetricsEnabled: true,
                executionRole: this.workGroupRole.roleArn,
            },
            description: `Workgroup for ${props.environment} Athena queries with QuickSight integration`,
        });

        this.workGroupName = workGroup.name!;
    }
}