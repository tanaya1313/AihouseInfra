import {
    aws_ec2 as ec2,
    aws_secretsmanager as secretsmanager,
    aws_rds as rds,
    Duration,
    RemovalPolicy,
    Tags,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface AuroraVectorStoreProps {
    readonly dbName?: string;
    readonly username?: string;
    readonly enableIamAuth?: boolean;
    readonly environment: string; // Add environment as a required property
}

export class AuroraVectorStoreConstruct extends Construct {
    public readonly vpc: ec2.Vpc;
    public readonly secret: secretsmanager.Secret;
    public readonly cluster: rds.DatabaseCluster;
    public readonly securityGroup: ec2.SecurityGroup;

    constructor(scope: Construct, id: string, props: AuroraVectorStoreProps) {
        super(scope, id);

        const dbName = props.dbName ?? 'vectorstore';
        const username = props.username ?? 'vectoruser';
        const enableIamAuth = props.enableIamAuth ?? true;

        // --- VPC ---
        this.vpc = new ec2.Vpc(this, 'AihouseVpc', {
            natGateways: 0,
            subnetConfiguration: [
                {
                    name: 'PublicSubnet1',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
                {
                    name: 'PublicSubnet2',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
            ],
        });
        Tags.of(this.vpc).add('Environment', props.environment);

        // --- Security Group ---
        this.securityGroup = new ec2.SecurityGroup(this, 'AuroraSecurityGroup', {
            vpc: this.vpc,
            allowAllOutbound: false,
            description: 'Security group for Aurora PostgreSQL',
        });
        Tags.of(this.securityGroup).add('Environment', props.environment);

        // --- Secrets Manager (username/password only) ---
        this.secret = new secretsmanager.Secret(this, 'AuroraSecret', {
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username }),
                generateStringKey: 'password',
                excludePunctuation: true,
            },
        });
        Tags.of(this.secret).add('Environment', props.environment);

        // --- Aurora Serverless v2 cluster (PostgreSQL) ---
        this.cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
            engine: rds.DatabaseClusterEngine.auroraPostgres({
                version: rds.AuroraPostgresEngineVersion.VER_15_7,
            }),
            clusterIdentifier: 'Bedrock_Knowledge_Base_Cluster',
            writer: rds.ClusterInstance.serverlessV2('writer'),
            vpc: this.vpc,
            securityGroups: [this.securityGroup],
            defaultDatabaseName: 'Bedrock_Knowledge_Base_Cluster',
            removalPolicy: RemovalPolicy.DESTROY, // Change to RETAIN for production
            deletionProtection: false,
            credentials: rds.Credentials.fromSecret(this.secret), // assuming you have `this.secret` defined
            autoMinorVersionUpgrade: false,
            iamAuthentication: enableIamAuth,
        });
        Tags.of(this.cluster).add('Environment', props.environment);

        // Optional: Add password rotation
        this.cluster.addRotationSingleUser();
    }
}