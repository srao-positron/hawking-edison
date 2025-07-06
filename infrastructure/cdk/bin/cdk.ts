#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { HawkingEdisonStack } from '../lib/hawking-edison-stack'

const app = new cdk.App()

// Get environment from context or default to dev
const environment = app.node.tryGetContext('environment') || 'dev'

new HawkingEdisonStack(app, `HawkingEdisonStack-${environment}`, {
  stackName: `hawking-edison-${environment}`,
  description: 'Hawking Edison async task processing infrastructure',
  env: {
    // Use environment variables or defaults
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Project: 'hawking-edison',
    Environment: environment,
    ManagedBy: 'cdk',
  },
})