// imports rewritten with <3 from denoporter - https://github.com/SirJosh3917/denoporter

import Validator from "./Validator.ts";
import FunctionType, { FunctionParameters } from "./schema/FunctionType.ts";
import { type } from "./schema/validations.ts";
export class ObjectValidator<
// eslint-disable-next-line @typescript-eslint/ban-types
P extends FunctionParameters = [object]> extends Validator<FunctionType<object, P>> {
}
const object = new ObjectValidator(type("object")).proxy();
export default object;
