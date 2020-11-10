/*
 * Copyright (c) 2020. This code created and belongs to Pathfinder render manager project.
 * Owner and project architect: Danil Andreev | danssg08@gmail.com |  https://github.com/DanilAndreev
 * File creator: Danil Andreev
 * Project: atlas-core
 * File last modified: 11/10/20, 3:01 PM
 * All rights reserved.
 */

import Controller from "../core/Controller";
import {Context} from "koa";
import {PLUGIN_SETTING_TYPES} from "../globals";
import RequestError from "../errors/RequestError";
import Temp from "../entities/Temp";
import * as UnZipper from "unzipper";
import * as StreamBuffers from "stream-buffers";
import streamToBuffer from "../utils/streamToBuffer";
import Plugin from "../entities/Plugin";
import Organization from "../entities/Organization";


/**
 * PluginController - controller for /plugins route.
 * @class
 * @author Danil Andreev
 */
export default class PluginController extends Controller {
    constructor() {
        super("/plugins");
        this.post("/", this.addPlugin);
    }

    public static validatePluginSettings(settings: object): boolean {
        if (typeof settings !== "object") return false;
        for (const key in settings) {
            if (!PLUGIN_SETTING_TYPES.includes(settings[key])) return false;
        }
        return true;
    }

    /**
     * Route __[POST]__ ___/plugins___ - Adds new plugin.
     * @code 200
     * @method
     * @author DanilAndreev
     */
    public async addPlugin(ctx: Context): Promise<void> {
        const {organization: orgId} = ctx.request.query;
        const body = ctx.request.body;

        // if (!PluginController.validatePluginSettings(body.settings))
        //     throw new RequestError(400, "Invalid plugin settings");

        const file: Temp = await Temp.findOne({where: {id: body.file}});
        if (!file)
            throw new RequestError(404, "Temp file not found.", {missedFile: [body.file]});

        const plugin = new Plugin();


        if (orgId) {
            const organization: Organization = await Organization.findOne({where: {id: orgId}});
            if (!organization)
                throw new RequestError(404, "Organization not found.");
            plugin.organization = organization;
        }


        try {
            const stream = new StreamBuffers.ReadableStreamBuffer({
                chunkSize: 2048
            });
            stream.put(file.data);
            await stream
                .pipe(UnZipper.Parse())
                .on("entry", async (entry) => {
                    const {fileName, type, size} = entry;
                    switch (fileName) {
                        case "spec.json": {
                            const buffer = await streamToBuffer(entry);
                            const settings: object = JSON.parse(buffer.toString());
                            if (PluginController.validatePluginSettings(settings)) {
                                plugin.rules = settings;
                            } else {
                                throw new TypeError("Invalid plugin settings.");
                            }
                        }
                        break;
                        case "main.js": {
                            const buffer = await streamToBuffer(entry);
                            const text: string = buffer.toString();
                            plugin.script = text;
                        }
                        break;
                        default:
                            entry.autodrain();
                    }
                })
                .promise();
        } catch (error) {
            console.error(error.message);
            throw new RequestError(400, "Bad request");
        } finally {
            Temp.delete({id: file.id}).then();
        }
        await plugin.save();
    }
}
