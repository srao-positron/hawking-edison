#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = require("aws-cdk-lib");
const hawking_edison_stack_1 = require("../lib/hawking-edison-stack");
const app = new cdk.App();
// Get environment from context or default to dev
const environment = app.node.tryGetContext('environment') || 'dev';
new hawking_edison_stack_1.HawkingEdisonStack(app, `HawkingEdisonStack-${environment}`, {
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYmluL2Nkay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSx1Q0FBb0M7QUFDcEMsbUNBQWtDO0FBQ2xDLHNFQUFnRTtBQUVoRSxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtBQUV6QixpREFBaUQ7QUFDakQsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFBO0FBRWxFLElBQUkseUNBQWtCLENBQUMsR0FBRyxFQUFFLHNCQUFzQixXQUFXLEVBQUUsRUFBRTtJQUMvRCxTQUFTLEVBQUUsa0JBQWtCLFdBQVcsRUFBRTtJQUMxQyxXQUFXLEVBQUUscURBQXFEO0lBQ2xFLEdBQUcsRUFBRTtRQUNILHdDQUF3QztRQUN4QyxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksV0FBVztLQUN0RDtJQUNELElBQUksRUFBRTtRQUNKLE9BQU8sRUFBRSxnQkFBZ0I7UUFDekIsV0FBVyxFQUFFLFdBQVc7UUFDeEIsU0FBUyxFQUFFLEtBQUs7S0FDakI7Q0FDRixDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcidcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcbmltcG9ydCB7IEhhd2tpbmdFZGlzb25TdGFjayB9IGZyb20gJy4uL2xpYi9oYXdraW5nLWVkaXNvbi1zdGFjaydcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKVxuXG4vLyBHZXQgZW52aXJvbm1lbnQgZnJvbSBjb250ZXh0IG9yIGRlZmF1bHQgdG8gZGV2XG5jb25zdCBlbnZpcm9ubWVudCA9IGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgfHwgJ2RldidcblxubmV3IEhhd2tpbmdFZGlzb25TdGFjayhhcHAsIGBIYXdraW5nRWRpc29uU3RhY2stJHtlbnZpcm9ubWVudH1gLCB7XG4gIHN0YWNrTmFtZTogYGhhd2tpbmctZWRpc29uLSR7ZW52aXJvbm1lbnR9YCxcbiAgZGVzY3JpcHRpb246ICdIYXdraW5nIEVkaXNvbiBhc3luYyB0YXNrIHByb2Nlc3NpbmcgaW5mcmFzdHJ1Y3R1cmUnLFxuICBlbnY6IHtcbiAgICAvLyBVc2UgZW52aXJvbm1lbnQgdmFyaWFibGVzIG9yIGRlZmF1bHRzXG4gICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcbiAgfSxcbiAgdGFnczoge1xuICAgIFByb2plY3Q6ICdoYXdraW5nLWVkaXNvbicsXG4gICAgRW52aXJvbm1lbnQ6IGVudmlyb25tZW50LFxuICAgIE1hbmFnZWRCeTogJ2NkaycsXG4gIH0sXG59KSJdfQ==