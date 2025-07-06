import { SQSEvent } from 'aws-lambda';
export declare function handler(event: SQSEvent): Promise<{
    batchItemFailures: {
        itemIdentifier: string;
    }[];
}>;
