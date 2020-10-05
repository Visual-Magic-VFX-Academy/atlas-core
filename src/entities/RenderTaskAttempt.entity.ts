/*
 * Copyright (c) 2020. This code created and belongs to Pathfinder render manager project.
 * Owner and project architect: Danil Andreev | danssg08@gmail.com |  https://github.com/DanilAndreev
 * File creator: Denis Afendikov
 * Project: pathfinder-core
 * File last modified: 05.10.2020, 15:51
 * All rights reserved.
 */

import {BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn, Timestamp} from "typeorm";
import Job from "./Job.entity";
import RenderTask from "./RenderTask.entity";

/**
 * JobEntity - typeorm entity for job data.
 * @class
 * @author Denis Afendikov
 */
@Entity()
export default class RenderTaskAttempt extends BaseEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(type => RenderTask, renderTask => renderTask.taskAttempts)
    task: RenderTask;

    @Column()
    slave: number;

    @Column({type: "varchar", default: 50})
    status: string;

    @Column({type: "timestamp"})
    created_at: Timestamp;

    @Column({type: "timestamp"})
    updated_at: Timestamp;

}