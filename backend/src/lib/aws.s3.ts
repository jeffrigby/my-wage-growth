import {
  CopyObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  PutObjectCommand,
  PutObjectCommandInput,
  PutObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable, PassThrough } from 'stream';
import { createGunzip } from 'zlib';
import { getLogger } from '@/lib/logger';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const logger = getLogger();

// Initialize S3 clients
const s3Client = new S3Client();
const s3ClientWithRetry = new S3Client({
  maxAttempts: 10,
  retryMode: 'standard',
});
/**
 * A generic function to upload an object to an S3 bucket with configurable client.
 *
 * @param client - The S3 client to use for the upload.
 * @param params - The parameters to pass to the S3 PutObjectCommand.
 * @returns - A promise that resolves to the output of the PutObjectCommand.
 * @throws - Throws an error if unable to upload the object to S3.
 */
const putS3ObjectGeneric = async (client: S3Client, params: PutObjectCommandInput): Promise<PutObjectCommandOutput> => {
  try {
    const command = new PutObjectCommand(params);
    return await client.send(command);
  } catch (error) {
    const { Bucket, Key } = params;
    logger.error('Error writing to S3', { error, Bucket, Key });
    throw error;
  }
};

// Wrapper function for standard put operation
export const putS3Object = (params: PutObjectCommandInput): Promise<PutObjectCommandOutput> => {
  return putS3ObjectGeneric(s3Client, params);
};

// Wrapper function for put operation with retry
export const putS3ObjectWithRetry = (params: PutObjectCommandInput): Promise<PutObjectCommandOutput> => {
  return putS3ObjectGeneric(s3ClientWithRetry, params);
};

/**
 * Fetches an object from S3 and returns it as a readable stream.
 *
 * @param bucket - The name of the S3 bucket.
 * @param key - The key of the object in the S3 bucket.
 * @returns - A promise that resolves to a readable stream of the object data.
 * @throws - Throws an error if the fetched object is not a readable stream.
 */
export const getObject = async (bucket: string, key: string): Promise<GetObjectCommandOutput> => {
  const params = {
    Bucket: bucket,
    Key: key,
  };
  try {
    const command = new GetObjectCommand(params);
    return await s3Client.send(command);
  } catch (error) {
    logger.error('Error getting Object from s3', { error, bucket, key });
    throw error;
  }
};

/**
 * Fetches an object from S3 and returns it as a string.
 * @param bucket - The name of the S3 bucket.
 * @param key - The key of the object in the S3 bucket.
 */
export const getObjectAsString = async (bucket: string, key: string): Promise<string> => {
  try {
    const data = await getObject(bucket, key);
    if (data.Body instanceof Readable) {
      return data.Body.transformToString('utf-8');
    } else {
      throw new Error('Received data is not a readable stream.');
    }
  } catch (error) {
    logger.error('Error transforming Object from s3', { error, bucket, key });
    throw error;
  }
};

/**
 * Get the head from an S3 object
 * @param bucket - The name of the S3 bucket.
 * @param key - The key of the object in the S3 bucket.
 * @returns - A promise that resolves to the head of the object
 * @throws - Throws an error if unable to get the head of the object
 */
export const getObjectHead = async (bucket: string, key: string): Promise<HeadObjectCommandOutput> => {
  const params = {
    Bucket: bucket,
    Key: key,
  };
  try {
    return await s3Client.send(new HeadObjectCommand(params));
  } catch (error) {
    logger.error('Error getting S3 Object HEAD', { error, bucket, key });
    throw error;
  }
};

/**
 * Gunzip the given `s3Body` and return the decompressed data as a string.
 * @param  s3Body - The readable stream of the gzipped data.
 * @return  - A promise that resolves to the decompressed data as a string.
 */
export async function gunzipBody(s3Body: Readable): Promise<string> {
  let data: string = '';
  await new Promise((resolve, reject) => {
    const gunzip = createGunzip();

    Readable.from(s3Body)
      .pipe(gunzip)
      .on('data', (chunk) => (data += chunk.toString()))
      .on('end', resolve)
      .on('error', reject);
  });
  return data;
}

/**
 * Retrieves and decompresses a file from an S3 bucket.
 * @param bucket - The name of the S3 bucket.
 * @param key - The key of the file in the S3 bucket.
 * @returns - A Promise that resolves with an object containing the metadata and body of the file.
 * @throws - If the response body is empty.
 */
export async function getAndDecompressS3File(
  bucket: string,
  key: string,
): Promise<{
  metadata: Record<string, string> | undefined;
  body: string;
}> {
  const response = await getObject(bucket, key);
  if (!response.Body) {
    throw new Error('Empty response body');
  }

  const data: string = await gunzipBody(response.Body as Readable);
  return { body: data, metadata: response.Metadata };
}

/**
 * Fetches an object from S3 and returns it as a readable stream.
 *
 * @param bucket - The name of the S3 bucket.
 * @param key - The key of the object in the S3 bucket.
 * @returns - A promise that resolves to a readable stream of the object data.
 * @throws - Throws an error if the fetched object is not a readable stream.
 */
export const getObjectStream = async (bucket: string, key: string): Promise<Readable> => {
  const params = {
    Bucket: bucket,
    Key: key,
  };
  try {
    const command = new GetObjectCommand(params);
    const data = await s3Client.send(command);
    if (data.Body instanceof Readable) {
      return data.Body;
    } else {
      throw new Error('Received data is not a readable stream.');
    }
  } catch (error) {
    logger.error('Error getting Object from s3', { error });
    throw error;
  }
};

/**
 * Copies an object from the source bucket to the destination bucket with a specified prefix.
 * @param sourceBucket The name of the source S3 bucket.
 * @param sourceKey The key of the object in the source S3 bucket.
 * @param destBucket The name of the destination S3 bucket.
 * @param destPrefix The prefix under which the object should be stored in the destination bucket.
 * @return A promise that resolves when the object is successfully copied or rejects if an error occurs.
 */
export async function copyObject(sourceBucket: string, sourceKey: string, destBucket: string, destPrefix: string) {
  const copyParams = {
    Bucket: destBucket,
    CopySource: `/${sourceBucket}/${sourceKey}`,
    Key: `${destPrefix}/${sourceKey}`,
  };
  try {
    const res = await s3Client.send(new CopyObjectCommand(copyParams));
    logger.info('Copied file', { copyParams });
    return res;
  } catch (error) {
    logger.error('Error copying file', { error, copyParams });
    throw error;
  }
}

/**
 * Asynchronously generates a signed URL for an S3 operation.
 *
 * This function creates a pre-signed URL for either uploading or retrieving an object
 * in an S3 bucket, depending on the provided command type. The generated URL
 * will allow temporary access for a specified duration.
 *
 * @param objectParams - The parameters defining the S3 operation,
 * such as bucket name, key, and operation type (put or get).
 * @returns A promise that resolves to a signed URL.
 * @throws Will throw an error if URL generation fails, providing error details in the logger.
 */
export const generateSignedUrl = async (objectParams: PutObjectCommand | GetObjectCommand): Promise<string> => {
  try {
    return await getSignedUrl(s3Client, objectParams, { expiresIn: 3600 });
  } catch (error) {
    logger.error('Error generating signed URL', { objectParams, error });
    throw error;
  }
};

/**
 * Handles streaming uploads to S3 using multipart upload
 * Use this for large files that need to be uploaded incrementally without storing the entire file in memory
 */
export class S3StreamUploader {
  private readonly stream: PassThrough;
  private upload: Upload;
  private readonly uploadPromise: Promise<any>;

  /**
   * Creates a new streaming upload to S3
   * @param params - S3 put object parameters (must include Bucket and Key)
   * @param useRetry - Whether to use the S3 client with retry configuration (defaults to true)
   * @param partSize - Size of each part in bytes (defaults to 5MB)
   * @param queueSize - Number of concurrent uploads (defaults to 4)
   */
  constructor(params: PutObjectCommandInput, useRetry = true, partSize = 10 * 1024 * 1024, queueSize = 10) {
    if (!params.Bucket || !params.Key) {
      throw new Error('Bucket and Key must be provided in params');
    }

    logger.info('Initializing S3StreamUploader', {
      bucket: params.Bucket,
      key: params.Key,
    });

    this.stream = new PassThrough();

    const client = useRetry ? s3ClientWithRetry : s3Client;

    this.upload = new Upload({
      client,
      params: {
        ...params,
        Body: this.stream, // Override any provided Body with our stream
      },
      partSize,
      queueSize,
    });

    // Start the upload process
    this.uploadPromise = this.upload.done();
  }

  /**
   * Adds data to the upload stream
   * @param data - Data chunk to upload (string or Buffer)
   */
  addData(data: string | Buffer): void {
    const size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8');
    logger.debug('Adding data to S3 stream upload', { dataSize: size });
    this.stream.write(data);
  }

  /**
   * Completes the upload and returns the result
   * @returns - A promise that resolves to the upload result
   * @throws - Throws an error if unable to complete the upload
   */
  async complete(): Promise<any> {
    logger.info('Completing S3 stream upload');

    // End the stream to signal no more data
    this.stream.end();

    try {
      const result = await this.uploadPromise;
      logger.info('S3 stream upload completed successfully', {
        bucket: result.Bucket,
        key: result.Key,
      });
      return result;
    } catch (error) {
      logger.error('Failed to complete S3 stream upload', { error });
      throw error;
    }
  }

  /**
   * Aborts the multipart upload
   * @throws - Throws an error if unable to abort the upload
   */
  async abort(): Promise<void> {
    logger.info('Aborting S3 stream upload');

    this.stream.end();

    try {
      await this.upload.abort();
      logger.info('S3 stream upload aborted successfully');
    } catch (error) {
      logger.error('Failed to abort S3 stream upload', { error });
      throw error;
    }
  }
}
