/*
 * Copyright (c) 2020. This code created and belongs to Pathfinder render manager project.
 * Owner and project architect: Danil Andreev | danssg08@gmail.com |  https://github.com/DanilAndreev
 * File creator: Danil Andreev
 * Project: pathfinder-core
 * File last modified: 10/29/20, 4:21 PM
 * All rights reserved.
 */

import SystemLog from "../entities/SystemLog";

export type LOG_LEVELS = "info" | "warning" | "error";

/**
 * Logger - System logger. Creates records in database.
 * @class
 * @author Danil Andreev
 */
export default class Logger {
    /**
     * log - creates log record with selected level.
     * @method
     * @param level - Level of the log message.
     * @param payload - Payload of the message.
     * @author Danil Andreev
     */
    public static async log(level: LOG_LEVELS, payload: object): Promise<SystemLog> {
        const record = new SystemLog();
        record.level = level;
        record.payload = payload;
        return await record.save();
    }

    /**
     * info - logs message with "info" level.
     * @method
     * @param payload - Payload of the message.
     * @author Danil Andreev
     */
    public static async info(payload: object): Promise<SystemLog> {
        const result = await Logger.log("info", payload);
        return result;
    }

    /**
     * warn - logs message with "warning" level.
     * @method
     * @param payload - Payload of the message.
     * @author Danil Andreev
     */
    public static async warn(payload: object): Promise<SystemLog> {
        const result = await Logger.log("warning", payload);
        return result;
    }

    /**
     * error - logs message with "error" level.
     * @method
     * @param payload - Payload of the message.
     * @author Danil Andreev
     */
    public static async error(payload: object): Promise<SystemLog> {
        const result = await Logger.log("error", payload);
        return result;
    }
}