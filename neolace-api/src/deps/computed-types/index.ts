// imports rewritten with <3 from denoporter - https://github.com/SirJosh3917/denoporter

import unknown from "./unknown.ts";
import object from "./object.ts";
import array from "./array.ts";
import string from "./string.ts";
import number from "./number.ts";
import boolean from "./boolean.ts";
import Schema from "./Schema.ts";
import DateType from "./DateType.ts";
import { SchemaResolveType, SchemaParameters, MergeSchemaParameters, SchemaReturnType, SchemaValidatorFunction, SchemaInput, } from "./schema/io.ts";
import { ValidationError, PathError } from "./schema/errors.ts";
import { isPromiseLike, ResolvedValue } from "./schema/utils.ts";
// type generator
export type Type<S> = SchemaResolveType<S>;
// type helpers
export type { ValidationError, PathError, SchemaInput, SchemaParameters, MergeSchemaParameters, SchemaReturnType, SchemaValidatorFunction, ResolvedValue, };
// runtime schema
export default Schema;
// runtime types
export { Schema, unknown, object, array, string, number, boolean, DateType };
// runtime helpers
export { isPromiseLike };
