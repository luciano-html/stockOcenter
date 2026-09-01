"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectIdSchema = void 0;
var zod_1 = require("zod");
var mongoose_1 = require("mongoose");
exports.objectIdSchema = zod_1.z
    .string()
    .refine(function (val) { return mongoose_1.default.Types.ObjectId.isValid(val); }, {
    message: 'ID inválido',
});
