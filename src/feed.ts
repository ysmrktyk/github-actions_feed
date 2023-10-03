import axios from 'axios';
import Parser from 'rss-parser';
import { config } from 'dotenv';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandOutput,
  GetObjectCommand,
  GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import {
  feedUrls,
  previousItemsFileName,
} from './config';

config();

export class FetchFeed {
  private parser: Parser;
  private discordWebhookUrl: string;
  private s3Client: S3Client;
  private bucket: string;
  private fileName = previousItemsFileName;
  private dryRunMode: boolean;

  constructor() {
    if (!process.env.DISCORD_WEBHOOK_URL) {
      throw new Error('not value discordWebhookUrl');
    }
    if (!process.env.CLOUDFLARE_R2_ACCOUNT_ID) {
      throw new Error('not value cloudflareR2AccountId');
    }
    if (!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID) {
      throw new Error('not value cloudflareR2AccessKeyId');
    }
    if (!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
      throw new Error('not value cloudflareR2SecretAccessKey');
    }
    if (!process.env.CLOUDFLARE_R2_BUCKET) {
      throw new Error('not value cloudflareR2Bucket');
    }
    this.parser = new Parser();
    this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    this.bucket = process.env.CLOUDFLARE_R2_BUCKET;
    this.s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });
    this.dryRunMode = process.argv.includes('--dry-run');
  }

  public async main(): Promise<void> {
    try {
      const newPreviousItems = [];
      const previousItems = await this._readPreviousItems();
      for (const url of feedUrls) {
        const feed = await this.parser.parseURL(url);
        if (!feed.items || feed.items.length === 0) {
          continue;
        }
        for (const item of feed.items) {
          if (!item.link) {
            continue;
          }
          if (previousItems.includes(item.link)) {
            newPreviousItems.push(item.link);
            continue;
          }
          if (this.dryRunMode) {
            console.log(`Dry run: Sending to Discord: [${item.title}](${item.link})`);
          } else {
            await this._sendToDiscord(item);
          }
          newPreviousItems.push(item.link);
        }
      }
      if (!this.dryRunMode && JSON.stringify(previousItems) !== JSON.stringify(newPreviousItems)) {
        await this._savePreviousItems(JSON.stringify(newPreviousItems, null, 2));
      }
    } catch (error) {
      console.error('Error fetching or parsing feed:', error);
    }
  }

  private async _readPreviousItems(): Promise<string[]> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.fileName,
    });
    try {
      const response: GetObjectCommandOutput = await this.s3Client.send(command);
      if (response.Body) {
        const json = await response.Body.transformToString();
        return JSON.parse(json);
      }
    } catch (error) {
      console.error('Error read previousItems:', error);
    }
    return [];
  }

  private async _savePreviousItems(body: string): Promise<PutObjectCommandOutput> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: this.fileName,
      Body: body,
    });
    try {
      return await this.s3Client.send(command);
    } catch (error) {
      throw error;
    }
  }

  private async _sendToDiscord(item: Parser.Item): Promise<void> {
    try {
      await axios.post(this.discordWebhookUrl, { content: `[${item.title}](${item.link})` });
    } catch (error) {
      console.error('Error sending message to Discord:', error);
    }
  }
}
