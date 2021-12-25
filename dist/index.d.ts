export declare type GenMethodArgs = {
    name: string;
    type: GenType;
    optional?: boolean;
}[];
export interface GenType {
    to_str(): string;
}
export declare class GenRawType implements GenType {
    raw: string;
    private constructor();
    to_str(): string;
    static of(raw: string): GenNamedType;
}
export declare class GenNamedType implements GenType {
    name: string;
    constructor(name: string);
    to_str(): string;
    static of(name: string): GenNamedType;
}
export declare class GenPrimitive implements GenType {
    name: string;
    constructor(name: string);
    static str: GenPrimitive;
    static num: GenPrimitive;
    static bool: GenPrimitive;
    static any: GenPrimitive;
    to_str(): string;
}
export declare class GenArr implements GenType {
    base: GenType;
    constructor(base: GenType);
    to_str(): string;
    static of(base: GenType): GenArr;
}
export declare class GenMap implements GenType {
    base: GenType;
    constructor(base: GenType);
    to_str(): string;
    static of(base: GenType): GenMap;
}
export declare class GenMap2 implements GenType {
    base: GenType;
    constructor(base: GenType);
    to_str(): string;
    static of(base: GenType): GenMap2;
}
export declare class GenNullable implements GenType {
    base: GenType;
    constructor(base: GenType);
    to_str(): string;
    static of(base: GenType): GenNullable;
}
export declare abstract class GenDecl {
    _tags: Map<string, GenTag[]>;
    add_tag(...tags: GenTag[]): void;
    constructor();
    abstract output(): string[];
}
export declare class GenAttr extends GenDecl {
    name: string;
    type: GenType;
    default?: string;
    for_type: boolean;
    optional: boolean;
    constructor(name: string, type: GenType, default_val?: string, optional?: boolean, ...tags: GenTag[]);
    output(): string[];
}
export declare class GenMethod extends GenDecl {
    name: string;
    args: GenMethodArgs;
    body: string[];
    is_static: boolean;
    is_exported: boolean;
    needs_function: boolean;
    constructor(name: string, args?: GenMethodArgs, body?: string[]);
    output(): any[];
}
export declare class GenPropertyGetter extends GenDecl {
    name: string;
    body: string[];
    constructor(name: string, body?: string[]);
    output(): string[];
}
export declare class GenPropertySetter extends GenDecl {
    name: string;
    type: GenType;
    body: string[];
    constructor(name: string, type: GenType, body?: string[]);
    output(): string[];
}
export declare class GenEnumMember extends GenDecl {
    name: string;
    value: any;
    constructor(name: string, value?: any);
    output(): string[];
}
export declare class GenEnum extends GenDecl {
    is_exported: boolean;
    output_all_set: boolean;
    name: string;
    members: GenEnumMember[];
    decls: GenDecl[];
    constructor(name: string);
    add(name: string, ...tags: GenTag[]): void;
    add_with_value(name: string, value: any, ...tags: GenTag[]): void;
    output(): string[];
}
export declare class GenClass extends GenDecl {
    is_exported: boolean;
    is_type: boolean;
    name: string;
    decls: GenDecl[];
    constructor(name: string);
    output(): string[];
}
export declare class GenGVar extends GenDecl {
    name: string;
    type: GenType | null;
    value: string | null;
    is_exported: boolean;
    is_const: boolean;
    constructor(name: string, value: string, type?: GenType);
    output(): any[];
}
export declare class GenTypeRaw extends GenDecl {
    name: string;
    raw_value: string;
    is_exported: boolean;
    constructor(name: string, raw_value: string);
    output(): any[];
}
export declare class GenFile {
    private ctx;
    path: string;
    skip_generation: boolean;
    _decls: GenDecl[];
    imports: {
        path: string;
        identifiers: string[];
    }[];
    constructor(ctx: GenCtx, path: string);
    get decls(): GenDecl[];
    output(): Promise<void>;
    add_rel_import(target_path: string, identifiers: string[]): void;
    add_class(name: string, is_exported?: boolean): GenClass;
    add_type(name: string, is_exported?: boolean): GenClass;
    add_enum(name: string, is_exported?: boolean): GenEnum;
    add_const_g_var(name: string, value: string, type?: GenType): GenGVar;
    add_type_raw(name: string, raw_value: string, exported?: boolean): GenTypeRaw;
    begin_group(): void;
    end_group(): void;
}
export declare class GenTag {
    name: string;
    data?: any;
    constructor(name: string, data?: any);
}
export declare abstract class GenProc {
    ctx: GenCtx;
    constructor(ctx: GenCtx);
}
export declare class GenCtx {
    project_dir: string;
    constructor(project_dir: string);
    iterate_tagged(tag: GenTag): Generator<GenDecl, void, unknown>;
    files: GenFile[];
    decls: Map<string, GenDecl>;
    file(filename: string): GenFile;
    end_phase(): void;
    query_decl(name: string): GenDecl;
    output(): Promise<void>;
}
