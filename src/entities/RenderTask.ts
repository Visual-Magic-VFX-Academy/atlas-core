/*
 * Copyright (c) 2020. This code created and belongs to Atlas render manager project.
 * Owner and project architect: Danil Andreev | danssg08@gmail.com |  https://github.com/DanilAndreev
 * Project: atlas-core
 * File last modified: 11/12/20, 5:25 PM
 * All rights reserved.
 */

import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import RenderJob from "./RenderJob";
import RenderTaskAttempt from "./RenderTaskAttempt";
import {Moment} from "moment";


/**
 * RenderTask - typeorm entity for render task data.
 * @class
 * @author Denis Afendikov
 */
@Entity()
export default class RenderTask extends BaseEntity {

    @PrimaryGeneratedColumn()
    id: number;

    /**
     * frame - frame number of the task.
     */
    @Column()
    frame: number;

    /**
     * renumbered - frame number of the task after renumbering.
     */
    @Column()
    renumbered: number;

    /**
     * status - render task status.
     * @type "pending" | "done" | "failed" | "processing"
     */
    @Column({type: "varchar", default: 50})
    status: string;

    /**
     * job - a job this render task belongs to.
     */
    @ManyToOne(
        type => RenderJob, job => job.renderTasks,
        {onDelete: "CASCADE", nullable: false}
    )
    job: RenderJob;

    /**
     * renderTaskAttempts - render task attempts.
     * Each try to process the task generates new render task attempt.
     */
    @OneToMany(type => RenderTaskAttempt, attempt => attempt.task, {cascade: true})
    renderTaskAttempts: RenderTaskAttempt[];

    @CreateDateColumn()
    createdAt: Moment;

    @UpdateDateColumn()
    updatedAt: Moment;
}
