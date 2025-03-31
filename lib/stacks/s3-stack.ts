import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { S3DataBucket } from '../constructs/s3-bucket';

export class S3BucketStack extends cdk.Stack {
    public readonly dataBucket1: S3DataBucket;
    public readonly dataBucket2: S3DataBucket;
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)
        // data buckets
        this.dataBucket1 = new S3DataBucket(this, 'DataBucket1', {
            bucketName: 'raw-data-bucket',
        })
        this.dataBucket2 = new S3DataBucket(this, 'DataBucket2', {
            bucketName: 'processed-data-bucket',
        })
   
    }
}
