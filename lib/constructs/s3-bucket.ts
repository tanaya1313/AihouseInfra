import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface DataBucketProps {
  bucketName: string;
}

export class S3DataBucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: DataBucketProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, 'DataBucket', {
      bucketName: props.bucketName,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Data loss prevent karega
      encryption: s3.BucketEncryption.S3_MANAGED, // Encryption enabled
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Public access block
      eventBridgeEnabled: true, //EventBridge for lambda and other services
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(300), 
          transitions: [
            { storageClass: s3.StorageClass.GLACIER, transitionAfter: cdk.Duration.days(180) },
          ],
        },
      ],
    });
    
  }
}

