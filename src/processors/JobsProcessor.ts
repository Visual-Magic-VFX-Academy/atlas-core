/*
 * Copyright (c) 2020. This code created and belongs to Atlas render manager project.
 * Owner and project architect: Danil Andreev | danssg08@gmail.com |  https://github.com/DanilAndreev
 * Project: atlas-core
 * File last modified: 11/12/20, 5:25 PM
 * All rights reserved.
 */

import {Channel, Message} from "amqplib";
import Server from "../core/Server";
import {AMQP_JOBS_QUEUE, AMQP_TASKS_QUEUE} from "../globals";
import JobEvent from "../core/JobEvent";
import RenderTask from "../entities/RenderTask";
import getFramesFromRange from "../utils/getFramesFromRange";
import RenderJob from "../entities/RenderJob";
import SystemLog from "../entities/SystemLog";
import Logger from "../core/Logger";


/**
 * JobsProcessor - function for processing render job queue.
 * @function
 * @async
 * @throws ReferenceError
 * @author Danil Andreev
 */
export default async function JobsProcessor() {
    /**
     * handler - AMQP messages handler.
     * @param message - AMQP message.
     * @param channel
     * @throws ReferenceError
     * @author Danil Andreev
     */
    async function handler(message: Message, channel: Channel) {
        try {
            const event: JobEvent = new JobEvent(JSON.parse(message.content.toString()));
            const inputJob: RenderJob = event.data;
            const frames: number[] = getFramesFromRange(inputJob.frameRange);


            // Find render job in database.
            const renderJob = await RenderJob.findOne({where: {id: inputJob.id}});
            if (!renderJob)
                throw new ReferenceError(`Can not find specified render job. Render job "id" = '${inputJob.id}' `);

            // Generate render tasks for each frame.
            const tasks: RenderTask[] = [];
            for (const frame in frames) {
                const task = new RenderTask();
                task.frame = +frame;
                task.status = "pending";
                task.job = renderJob;
                tasks.push(task);
            }

            // Insert generated render tasks to database.
            await RenderTask.createQueryBuilder().insert().values(tasks).execute();

            // Add tasks into RabbitMQ queue
            const channelTarget: Channel = await Server.getCurrent().getRabbit().createChannel();
            await channelTarget.assertQueue(AMQP_TASKS_QUEUE);
            for (const task of tasks) {
                channelTarget.sendToQueue(AMQP_TASKS_QUEUE, Buffer.from(JSON.stringify(task)));
            }
            await channelTarget.close();
            channel.ack(message);
        } catch (error) {
            if (error instanceof ReferenceError)
                channel.ack(message);
            else
                channel.nack(message);

            await Logger.error(error.message + " " + error.trace);
            //TODO: handle error
        }
    }

    const channel: Channel = await Server.getCurrent().getRabbit().createChannel();
    await channel.assertQueue(AMQP_JOBS_QUEUE);
    await channel.prefetch(1);
    await channel.consume(AMQP_JOBS_QUEUE, async (message: Message) => {
        console.log("Processing job");
        await handler(message, channel);
    });
}
