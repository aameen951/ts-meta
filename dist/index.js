"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenCtx = exports.GenProc = exports.GenTag = exports.GenFile = exports.GenTypeRaw = exports.GenGVar = exports.GenClass = exports.GenEnum = exports.GenEnumMember = exports.GenPropertySetter = exports.GenPropertyGetter = exports.GenMethod = exports.GenAttr = exports.GenDecl = exports.GenNullable = exports.GenMap2 = exports.GenMap = exports.GenArr = exports.GenPrimitive = exports.GenNamedType = exports.GenRawType = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class GenRawType {
    constructor(raw) {
        this.raw = raw;
    }
    to_str() { return this.raw; }
    static of(raw) {
        return new GenNamedType(raw);
    }
}
exports.GenRawType = GenRawType;
class GenNamedType {
    constructor(name) {
        this.name = name;
    }
    to_str() { return this.name; }
    static of(name) {
        return new GenNamedType(name);
    }
}
exports.GenNamedType = GenNamedType;
class GenPrimitive {
    constructor(name) {
        this.name = name;
    }
    to_str() { return this.name; }
}
exports.GenPrimitive = GenPrimitive;
GenPrimitive.str = new GenPrimitive("string");
GenPrimitive.num = new GenPrimitive("number");
GenPrimitive.bool = new GenPrimitive("boolean");
GenPrimitive.any = new GenPrimitive("any");
class GenArr {
    constructor(base) {
        this.base = base;
    }
    to_str() { return `${this.base.to_str()}[]`; }
    static of(base) { return new GenArr(base); }
}
exports.GenArr = GenArr;
class GenMap {
    constructor(base) {
        this.base = base;
    }
    to_str() { return `Map<string, ${this.base.to_str()}>`; }
    static of(base) { return new GenMap(base); }
}
exports.GenMap = GenMap;
class GenMap2 {
    constructor(base) {
        this.base = base;
    }
    to_str() { return `Map2<${this.base.to_str()}>`; }
    static of(base) { return new GenMap2(base); }
}
exports.GenMap2 = GenMap2;
class GenNullable {
    constructor(base) {
        this.base = base;
    }
    to_str() { return `(${this.base.to_str()} | null)`; }
    static of(base) { return new GenNullable(base); }
}
exports.GenNullable = GenNullable;
class GenDecl {
    constructor() {
        this._tags = new Map();
    }
    add_tag(...tags) {
        for (let tag of tags) {
            if (!this._tags.has(tag.name))
                this._tags.set(tag.name, []);
            this._tags.get(tag.name).push(tag);
        }
    }
}
exports.GenDecl = GenDecl;
function default_value_for_type(type) {
    if (type instanceof GenPrimitive) {
        switch (type.name) {
            case 'string': return `""`;
            case 'number': return `0`;
            case 'boolean': return `false`;
            case 'any': return `null`;
            default:
                throw new Error(`Unknown type ${type.name}`);
        }
    }
    else if (type instanceof GenNullable) {
        return `null`;
    }
    else if (type instanceof GenMap) {
        return `new Map()`;
    }
    else if (type instanceof GenMap2) {
        return `new Map2()`;
    }
    else if (type instanceof GenArr) {
        return `[]`;
    }
    else if (type instanceof GenNamedType) {
        if (type.name === 'Date')
            return 'new Date(0)';
        return `null`;
    }
}
class GenAttr extends GenDecl {
    constructor(name, type, default_val, optional = false, ...tags) {
        super();
        this.for_type = false;
        this.optional = false;
        this.name = name;
        this.type = type;
        this.default = default_val;
        this.optional = optional;
        this.add_tag(...tags);
    }
    output() {
        const output = [];
        const default_val = this.default === undefined ? default_value_for_type(this.type) : this.default;
        output.push(`${this.name}${this.optional ? '?' : ''}: ${this.type.to_str()}${this.for_type ? `` : ` = ${default_val}`};`);
        return output;
    }
}
exports.GenAttr = GenAttr;
class GenMethod extends GenDecl {
    constructor(name, args = [], body = []) {
        super();
        this.is_static = false;
        this.is_exported = false;
        this.needs_function = false;
        this.name = name;
        this.args = args;
        this.body = body;
    }
    output() {
        const output = [];
        const args_str = this.args.map(a => `${a.name}${a.optional ? '?' : ''}: ${a.type.to_str()}`).join(", ");
        output.push(`${this.is_exported ? 'export ' : ''}${this.is_static ? 'static ' : ''}${this.needs_function ? 'function ' : ''}${this.name}(${args_str}){`);
        output.push(...this.body, `}`);
        return output;
    }
}
exports.GenMethod = GenMethod;
class GenPropertyGetter extends GenDecl {
    constructor(name, body = []) {
        super();
        this.name = name;
        this.body = body;
    }
    output() {
        return [`get ${this.name}(){`, ...this.body, `}`];
    }
}
exports.GenPropertyGetter = GenPropertyGetter;
class GenPropertySetter extends GenDecl {
    constructor(name, type, body = []) {
        super();
        this.name = name;
        this.type = type;
        this.body = body;
    }
    output() {
        return [`set ${this.name}(value: ${this.type.to_str()}){`, ...this.body, `}`];
    }
}
exports.GenPropertySetter = GenPropertySetter;
class GenEnumMember extends GenDecl {
    constructor(name, value) {
        super();
        this.name = name;
        this.value = value;
    }
    output() {
        return [
            this.value !== undefined ? `${this.name} = ${JSON.stringify(this.value)},` : `${this.name},`
        ];
    }
}
exports.GenEnumMember = GenEnumMember;
class GenEnum extends GenDecl {
    constructor(name) {
        super();
        this.is_exported = false;
        this.output_all_set = false;
        this.decls = [];
        this.name = name;
        this.members = [];
    }
    add(name, ...tags) {
        const member = new GenEnumMember(name);
        if (tags.length)
            member.add_tag(...tags);
        this.members.push(member);
    }
    add_with_value(name, value, ...tags) {
        const member = new GenEnumMember(name, value);
        if (tags.length)
            member.add_tag(...tags);
        this.members.push(member);
    }
    output() {
        const output = [];
        output.push(`${this.is_exported ? 'export ' : ''}enum ${this.name} {`);
        for (let member of this.members) {
            output.push(...member.output());
        }
        output.push(`}`);
        if (this.output_all_set) {
            output.push(`${this.is_exported ? 'export ' : ''}namespace ${this.name} {`);
            output.push(`${this.is_exported ? 'export ' : ''} const all = () : ${this.name}[] => ([`);
            for (let member of this.members) {
                output.push(`${this.name}.${member.name},`);
            }
            output.push(`]);`);
            output.push(`${this.is_exported ? 'export ' : ''}const set = new Set(all());`);
            for (let decl of this.decls) {
                if (decl instanceof GenMethod)
                    decl.needs_function = true;
                if (decl instanceof GenMethod)
                    decl.is_static = false;
                if (decl instanceof GenMethod)
                    decl.is_exported = this.is_exported;
                output.push(...decl.output());
            }
            output.push(`}`);
        }
        return output;
    }
}
exports.GenEnum = GenEnum;
class GenClass extends GenDecl {
    constructor(name) {
        super();
        this.is_exported = false;
        this.is_type = false;
        this.name = name;
        this.decls = [];
    }
    output() {
        const output = [];
        if (this.is_type) {
            output.push(`${this.is_exported ? 'export ' : ''}type ${this.name} = {`);
        }
        else {
            output.push(`${this.is_exported ? 'export ' : ''}class ${this.name} {`);
        }
        for (let decl of this.decls) {
            if (decl instanceof GenAttr) {
                decl.for_type = true;
            }
            output.push(...decl.output());
        }
        output.push(`}`);
        return output;
    }
}
exports.GenClass = GenClass;
class GenGVar extends GenDecl {
    constructor(name, value, type) {
        super();
        this.is_exported = false;
        this.is_const = true;
        this.name = name;
        this.type = type || null;
        this.value = value;
    }
    output() {
        const output = [];
        output.push(`${this.is_exported ? 'export ' : ''}` +
            `${this.is_const ? 'const ' : 'let '}` +
            `${this.name}` +
            `${this.type ? `: ` + this.type.to_str() : ''}` +
            `${this.value ? ` = ` + this.value : ''};`);
        return output;
    }
}
exports.GenGVar = GenGVar;
class GenTypeRaw extends GenDecl {
    constructor(name, raw_value) {
        super();
        this.is_exported = false;
        this.name = name;
        this.raw_value = raw_value;
    }
    output() {
        const output = [];
        output.push(`${this.is_exported ? 'export ' : ''}` +
            `type ${this.name} = ${this.raw_value};`);
        return output;
    }
}
exports.GenTypeRaw = GenTypeRaw;
class _FileGroup extends GenDecl {
    constructor(type) {
        super();
        this.type = type;
    }
    output() {
        throw new Error('Method not implemented.');
    }
}
class GenFile {
    constructor(ctx, path) {
        this.skip_generation = false;
        this.ctx = ctx;
        this.path = path;
        this._decls = [];
        this.imports = [];
    }
    get decls() { return this._decls.filter(d => !(d instanceof _FileGroup)); }
    output() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.skip_generation)
                return;
            const output = [];
            output.push("/// AUTO GENERATED");
            for (let imp of this.imports) {
                let path = imp.path.replace(/\\/g, "/");
                if (path.endsWith(".ts"))
                    path = path.slice(0, -3);
                output.push(`import {${imp.identifiers.join(", ")}} from "${path}";`);
            }
            output.push("");
            let is_in_group = false;
            for (let decl of this._decls) {
                if (decl instanceof _FileGroup) {
                    if (decl.type === 'begin_group')
                        is_in_group = true;
                    if (decl.type === 'end_group') {
                        is_in_group = false;
                        output.push("");
                    }
                }
                else {
                    output.push(...decl.output());
                    if (!is_in_group) {
                        output.push("");
                    }
                }
            }
            const file_data = output.join("\r\n");
            yield fs_1.default.promises.writeFile(this.path, file_data, 'utf-8');
        });
    }
    add_rel_import(target_path, identifiers) {
        let rel_path = path_1.default.relative(path_1.default.dirname(this.path), path_1.default.join(this.ctx.project_dir, target_path));
        if (!rel_path.startsWith("./") && !rel_path.startsWith("../"))
            rel_path = './' + rel_path;
        this.imports.push({ path: rel_path, identifiers });
    }
    add_class(name, is_exported = false) {
        const cls = new GenClass(name);
        cls.is_exported = is_exported;
        this._decls.push(cls);
        return cls;
    }
    add_type(name, is_exported = false) {
        const typ = new GenClass(name);
        typ.is_type = true;
        typ.is_exported = is_exported;
        this._decls.push(typ);
        return typ;
    }
    add_enum(name, is_exported = false) {
        const enm = new GenEnum(name);
        enm.is_exported = is_exported;
        this._decls.push(enm);
        return enm;
    }
    add_const_g_var(name, value, type) {
        const g_var = new GenGVar(name, value, type);
        g_var.is_const = true;
        g_var.is_exported = true;
        this._decls.push(g_var);
        return g_var;
    }
    add_type_raw(name, raw_value, exported = false) {
        const type = new GenTypeRaw(name, raw_value);
        type.is_exported = exported;
        this._decls.push(type);
        return type;
    }
    begin_group() { this._decls.push(new _FileGroup('begin_group')); }
    end_group() { this._decls.push(new _FileGroup('end_group')); }
}
exports.GenFile = GenFile;
class GenTag {
    constructor(name, data) {
        this.name = name;
        this.data = data;
    }
}
exports.GenTag = GenTag;
class GenProc {
    constructor(ctx) {
        this.ctx = ctx;
    }
}
exports.GenProc = GenProc;
class GenCtx {
    constructor(project_dir) {
        this.project_dir = project_dir;
        this.files = [];
        this.decls = new Map();
    }
    *iterate_tagged(tag) {
        for (let file of this.files) {
            for (let decl of file.decls) {
                if (decl._tags.has(tag.name)) {
                    yield decl;
                }
            }
        }
    }
    file(filename) {
        const file_path = path_1.default.join(this.project_dir, filename + '.ts');
        const file = new GenFile(this, file_path);
        this.files.push(file);
        return file;
    }
    end_phase() {
        for (let file of this.files) {
            for (let decl of file.decls) {
                if (decl instanceof GenClass || decl instanceof GenEnum || decl instanceof GenMethod) {
                    this.decls.set(decl.name, decl);
                }
            }
        }
    }
    query_decl(name) {
        return this.decls.get(name);
    }
    output() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let file of this.files) {
                yield file.output();
            }
        });
    }
}
exports.GenCtx = GenCtx;
