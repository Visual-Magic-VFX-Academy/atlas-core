/*
 * Copyright (c) 2020. This code created and belongs to Atlas render manager project.
 * Owner and project architect: Danil Andreev | danssg08@gmail.com |  https://github.com/DanilAndreev
 * Project: atlas-core
 * File last modified: 11/12/20, 5:25 PM
 * All rights reserved.
 */


import Controller from "../core/Controller";
import {Context} from "koa";
import {
    IncludeUserIdInBodyValidator,
    IncludeUserIdsInBodyValidator,
    OrganizationRegisterValidator,
    RoleAddValidator, RoleEditValidator
} from "../validators/OrganizationRequestValidators";
import Role from "../entities/typeorm/Role";
import Organization from "../entities/typeorm/Organization";
import RequestError from "../errors/RequestError";
import {getConnection, getRepository} from "typeorm";
import User from "../entities/typeorm/User";
import {findOneOrganizationByRequestParams} from "../middlewares/organizationRequestMiddlewares";
import {canManageRoles, canManageUsers} from "../middlewares/withRoleAccessMiddleware";


/**
 * RolesController - controller for /organization/:org_id/roles routes.
 * @class
 * @author Denis Afendikov
 */
export default class RolesController extends Controller {
    constructor() {
        super("/:organization_id/roles");

        this.get("/", this.getRoles);
        this.post(
            "/",
            RoleAddValidator,
            findOneOrganizationByRequestParams({relations: ["ownerUser"]}),
            canManageRoles,
            this.addRole
        );

        this.get("/:role_id", this.getRole);
        this.post(
            "/:role_id",
            RoleEditValidator,
            findOneOrganizationByRequestParams({relations: ["ownerUser"]}),
            canManageRoles,
            this.editRole
        );
        this.delete(
            "/:role_id",
            findOneOrganizationByRequestParams({relations: ["ownerUser"]}),
            canManageRoles,
            this.deleteRole
        );

        // users
        this.get("/:role_id/users", this.getRoleUsers);
        this.post(
            "/:role_id/users",
            IncludeUserIdInBodyValidator,
            findOneOrganizationByRequestParams({relations: ["ownerUser"]}),
            canManageUsers,
            this.addRoleUser
        );

        // this.post("/:org_id/roles/:user_id", this.addRolesToUser);

        this.delete(
            "/:role_id/users",
            IncludeUserIdInBodyValidator,
            findOneOrganizationByRequestParams({relations: ["ownerUser"]}),
            canManageUsers,
            this.deleteRoleUser
        );
    }

    /**
     * Route __[GET]__ ___/:org_id/roles___ - get information about all organization's roles.
     * @method
     * @author Denis Afendikov
     */
    public async getRoles(ctx: Context): Promise<void> {
        console.log("Route __[GET]__ ___/:org_id/roles - get information about all organization's roles.");
        console.log("ctx.params: \n", ctx.params);
        console.log("ctx.request.body: \n", ctx.request.body);
        const org: Organization = await getRepository(Organization)
            .createQueryBuilder("org")
            .where({id: ctx.params.organization_id})
            .leftJoinAndSelect("org.roles", "roles")
            .getOne();

        if (!org) {
            console.log("Thrown error 404 from roles controller.");
            throw new RequestError(404, "Not found.");
        }
        console.log("Roles controller found organization.");

        ctx.body = org.roles;
        console.log("Roles controller finished work.");
    }

    /**
     * Route __[POST]__ ___/:org_id/roles___ - add role.
     * @method
     * @author Denis Afendikov
     */
    public async addRole(ctx: Context): Promise<void> {
        const org = ctx.state.organization;

        // check name uniqueness
        if (await Role.findOne({name: ctx.request.body.name, organization: org})) {
            throw new RequestError(409, "Role with this name already exist.",
                {errors: {name: "exists"}});
        }

        let role = new Role();
        role.name = ctx.request.body.name;
        role.description = ctx.request.body.description;
        role.color = ctx.request.body.color || "black"; // TODO random color
        role.permissionLevel = ctx.request.body.permissionLevel;
        role.organization = org;
        role.canManageUsers = ctx.request.body.canManageUsers;
        role.canManageRoles = ctx.request.body.canManageRoles;
        role.canCreateJobs = ctx.request.body.canCreateJobs;
        role.canDeleteJobs = ctx.request.body.canDeleteJobs;
        role.canEditJobs = ctx.request.body.canEditJobs;
        role.canManagePlugins = ctx.request.body.canManagePlugins;
        role.canManageTeams = ctx.request.body.canManageTeams;
        role.canEditAudit = ctx.request.body.canEditAudit;
        await role.save();
        ctx.body = {success: true};
    }

    /**
     * Route __[GET]__ ___/:org_id/roles/:role_id___ - get information about organization's role.
     * @method
     * @author Denis Afendikov
     */
    public async getRole(ctx: Context): Promise<void> {
        const org: Organization = await Organization.findOne(ctx.params.organization_id, {relations: ["ownerUser"]});
        if (!org) {
            throw new RequestError(404, "Not found.");
        }
        const role = await getRepository(Role)
            .createQueryBuilder("role")
            .where({id: ctx.params.role_id})
            .leftJoin("role.users", "users")
            .select(["role", "users.id", "users.username"])
            .getOne();
        if (!role) {
            throw new RequestError(404, "Role not found.");
        }

        ctx.body = role;
    }

    /**
     * Route __[POST]__ ___/:org_id/roles/:role_id___ - edit information about organization's role.
     * @method
     * @author Denis Afendikov
     */
    public async editRole(ctx: Context): Promise<void> {
        const org: Organization = ctx.state.organization;

        // find role that will be edited
        let role = await Role.findOne(ctx.params.role_id);
        if (!role) {
            throw new RequestError(404, "Role not found.");
        }

        // if name changed
        // check name uniqueness
        if (ctx.request.body.name && ctx.request.body.name !== role.name) {
            if (await Role.findOne({name: ctx.request.body.name, organization: org})) {
                throw new RequestError(409, "Role with this name already exist.",
                    {errors: {name: "exists"}});
            } else {
                role.name = ctx.request.body.name;
            }
        }

        Object.entries(ctx.request.body).forEach(([key, value]) => {
            role[key] = value;
        });
        // role.permissionLevel = ctx.request.body.permissionLevel || role.permissionLevel;
        // role.color = ctx.request.body.color || role.color;
        // role.description = ctx.request.body.description || role.description;
        // role.canManageUsers = ctx.request.body.canManageUsers || role.canManageUsers;
        // role.canManageRoles = ctx.request.body.canManageRoles || role.canManageRoles;
        // role.canCreateJobs = ctx.request.body.canCreateJobs || role.canCreateJobs;
        // role.canDeleteJobs = ctx.request.body.canDeleteJobs || role.canDeleteJobs;
        // role.canEditJobs = ctx.request.body.canEditJobs || role.canEditJobs;
        // role.canManagePlugins = ctx.request.body.canManagePlugins || role.canManagePlugins;
        // role.canManageTeams = ctx.request.body.canManageTeams || role.canManageTeams;
        // role.canEditAudit = ctx.request.body.canEditAudit;
        await role.save();

        ctx.body = {success: true};
    }

    /**
     * Route __[DELETE]__ ___/:org_id/roles/:role_id___ - delete role.
     * @method
     * @author Denis Afendikov
     */
    public async deleteRole(ctx: Context): Promise<void> {
        const role: Role = await Role.findOne(ctx.params.role_id);
        if (!role) {
            throw new RequestError(404, "Role not found.");
        }

        ctx.body = await role.remove();
    }

    /**
     * Route __[GET]__ ___/:org_id/roles/:role_id/users___ - get information about all users in organization's roles.
     * @method
     * @author Denis Afendikov
     */
    public async getRoleUsers(ctx: Context): Promise<void> {
        const org: Organization = await Organization.findOne(ctx.params.organization_id);
        if (!org) {
            throw new RequestError(404, "Organization not found.");
        }

        //const role: Role = await Role.findOne(ctx.params.role_id);
        const role: Role = await getRepository(Role)
            .createQueryBuilder("role")
            .where({id: ctx.params.role_id})
            .leftJoin("role.users", "users")
            .select(["role", "users.id", "users.username"])
            .getOne();

        if (!role) {
            throw new RequestError(404, "Role not found.");
        }

        ctx.body = role.users;
    }

    /**
     * Route __[POST]__ ___/:org_id/roles/:role_id/users___ - add user to organization's role.
     * @method
     * @author Denis Afendikov
     */
    public async addRoleUser(ctx: Context): Promise<void> {
        const role: Role = await Role.findOne(ctx.params.role_id, {relations: ["users"]});
        if (!role) {
            throw new RequestError(404, "Role not found.");
        }

        const addUser: User = await User.findOne(ctx.request.body.userId, {relations: ["roles"]});
        if (!addUser) {
            throw new RequestError(404, "User not found");
        }

        if (addUser.roles.find(userRole => userRole.id === role.id)) {
            throw new RequestError(403, "User already owns this role.");
        }

        // role.users.push(addUser);
        // await role.save();
        await getConnection()
            .createQueryBuilder()
            .relation(Role, "users")
            .of(role)
            .add(addUser);

        ctx.body = {success: true};
    }

    // /**
    //  * Route __[POST]__ ___/:org_id/roles/:user_id___ - add roles to organization's user.
    //  * @method
    //  * @author Danil Andreev
    //  */
    // public async addRolesToUser(ctx: Context): Promise<void> {
    //     const ids = ctx.request.body.roles;
    //
    //     const roles: Role[] = await Role.findByIds(ids);
    //
    //     //TODO: check if user is a member this organization!!!
    //     const user: User = await User.findOne(ctx.request.body.userId, {relations: ["roles"]});
    //     if (!user) {
    //         throw new RequestError(404, "User not found");
    //     }
    //
    //     for (const role of roles) {
    //         if(!user.roles.find(candidate => candidate.id === role.id))
    //             user.roles.push(role);
    //     }
    //
    //     await user.save();
    // }

    /**
     * Route __[DELETE]__ ___/:org_id/roles/:role_id/users - remove user from organization's role.
     * @method
     * @author Denis Afendikov
     */
    public async deleteRoleUser(ctx: Context): Promise<void> {
        const role: Role = await Role.findOne(ctx.params.role_id, {relations: ["users"]});
        if (!role) {
            throw new RequestError(404, "Role not found.");
        }

        const deleteUser: User = await User.findOne(ctx.request.body.userId, {relations: ["roles"]});
        if (!deleteUser) {
            throw new RequestError(404, "User not found");
        }

        if (!deleteUser.roles.find(userRole => userRole.id === role.id)) {
            throw new RequestError(403, "User does not own this role.");
        }

        await getConnection()
            .createQueryBuilder()
            .relation(Role, "users")
            .of(role)
            .remove(deleteUser);

        ctx.body = {success: true};
    }
}