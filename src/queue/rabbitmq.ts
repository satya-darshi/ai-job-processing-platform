import amqp, { Channel, Connection } from "amqplib";
import { env } from "../config/env";
import { JobMessage } from "../types/job";

export const JOB_QUEUE = "ai_jobs";
export const DEAD_LETTER_QUEUE = "ai_jobs_dlq";

let connection: Connection | undefined;
let channel: Channel | undefined;

export async function getChannel(): Promise<Channel> {
  if (channel) return channel;

  connection = await amqp.connect(env.rabbitmqUrl);
  channel = await connection.createChannel();

  await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
  await channel.assertQueue(JOB_QUEUE, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": DEAD_LETTER_QUEUE
    }
  });

  return channel;
}

export async function publishJob(message: JobMessage): Promise<void> {
  const ch = await getChannel();
  ch.sendToQueue(JOB_QUEUE, Buffer.from(JSON.stringify(message)), {
    persistent: true
  });
}
