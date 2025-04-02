import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { S3DataBucket } from '../constructs/s3-bucket';

export class S3Stack extends cdk.Stack {
    public readonly dataBucket1: S3DataBucket;
    public readonly dataBucket2: S3DataBucket;
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)
        // data buckets
        this.dataBucket1 = new S3DataBucket(this, 'DataBucket1', {
            bucketName: 'raw-ads-data-bucket',
        })
        this.dataBucket2 = new S3DataBucket(this, 'DataBucket2', {
            bucketName: 'processed-ads-data-bucket',
        })
        // Outputs
        new cdk.CfnOutput(this, 'DataBucket1Name', {
            value: this.dataBucket1.bucket.bucketName,
            description: 'The name of the raw ads data bucket',
            exportName: 'RawAdsDataBucketName',
        });

        new cdk.CfnOutput(this, 'DataBucket2Name', {
            value: this.dataBucket2.bucket.bucketName,
            description: 'The name of the processed ads data bucket',
            exportName: 'ProcessedAdsDataBucketName',
        });
    }
}
