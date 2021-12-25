import fs from 'fs';
import path from 'path';

export type GenMethodArgs = {name: string, type: GenType, optional?: boolean}[];

export interface GenType
{
  to_str(): string;
}

export class GenRawType implements GenType {
  raw: string;
  private constructor(raw: string){
    this.raw = raw;
  }
  to_str(){return this.raw;}
  static of(raw: string){
    return new GenNamedType(raw);
  }
}
export class GenNamedType implements GenType
{
  name: string;
  constructor(name: string){
    this.name = name;
  }
  to_str(){return this.name;}
  static of(name: string){
    return new GenNamedType(name);
  }
}
export class GenPrimitive implements GenType
{
  name: string;
  constructor(name: string){
    this.name = name;
  }
  static str = new GenPrimitive("string");
  static num = new GenPrimitive("number");
  static bool = new GenPrimitive("boolean");
  static any = new GenPrimitive("any");

  to_str(){return this.name;}
}
export class GenArr implements GenType
{
  base: GenType;
  constructor(base: GenType){
    this.base = base;
  }
  to_str(){ return `${this.base.to_str()}[]`}

  static of(base: GenType){return new GenArr(base);}
}
export class GenMap implements GenType
{
  base: GenType;
  constructor(base: GenType){
    this.base = base;
  }
  to_str(){ return `Map<string, ${this.base.to_str()}>`}

  static of(base: GenType){return new GenMap(base);}
}
export class GenMap2 implements GenType
{
  base: GenType;
  constructor(base: GenType){
    this.base = base;
  }
  to_str(){ return `Map2<${this.base.to_str()}>`}

  static of(base: GenType){return new GenMap2(base);}
}
export class GenNullable implements GenType
{
  base: GenType;
  constructor(base: GenType){
    this.base = base;
  }
  to_str(){ return `(${this.base.to_str()} | null)`}

  static of(base: GenType){return new GenNullable(base);}
}
export abstract class GenDecl
{
  _tags = new Map<string, GenTag[]>();
  add_tag(...tags: GenTag[]){
    for(let tag of tags)
    {
      if(!this._tags.has(tag.name))this._tags.set(tag.name, [] as GenTag[]);
      this._tags.get(tag.name)!.push(tag);
    }
  }
  constructor(){
  }
  abstract output(): string[];
}

function default_value_for_type(type: GenType)
{
  if(type instanceof GenPrimitive){
    switch(type.name){
      case 'string': return `""`;
      case 'number': return `0`;
      case 'boolean': return `false`;
      case 'any': return `null`;
      default:
        throw new Error(`Unknown type ${type.name}`);
    }
  }
  else if(type instanceof GenNullable){
    return `null`;
  }
  else if(type instanceof GenMap){
    return `new Map()`;
  }
  else if(type instanceof GenMap2){
    return `new Map2()`;
  }
  else if(type instanceof GenArr){
    return `[]`;
  }
  else if(type instanceof GenNamedType){
    if(type.name === 'Date')return 'new Date(0)';
    return `null`;
  }
}
export class GenAttr extends GenDecl
{
  name: string;
  type: GenType;
  default?: string;
  for_type = false;
  optional = false;

  constructor(name: string, type: GenType, default_val?: string, optional = false, ...tags: GenTag[]){
    super();
    this.name = name;
    this.type = type;
    this.default = default_val;
    this.optional = optional;
    this.add_tag(...tags);
  }
  output(): string[] {
    const output = [];
    const default_val = this.default === undefined ? default_value_for_type(this.type) : this.default;
    output.push(`${this.name}${this.optional ? '?':''}: ${this.type.to_str()}${this.for_type ? `` : ` = ${default_val}`};`);
    return output;
  }
}
export class GenMethod extends GenDecl
{
  name: string;
  args: GenMethodArgs
  body: string[];
  is_static = false;
  is_exported = false;
  needs_function = false;

  constructor(name: string, args: GenMethodArgs = [], body: string[] = []){
    super();
    this.name = name;
    this.args = args;
    this.body = body;
  }
  output(){
    const output = [];
    const args_str = this.args.map(a => `${a.name}${a.optional ? '?':''}: ${a.type.to_str()}`).join(", ");
    output.push(`${this.is_exported?'export ':''}${this.is_static?'static ':''}${this.needs_function?'function ':''}${this.name}(${args_str}){`);
    output.push(...this.body, `}`);
    return output;
  }
}
export class GenPropertyGetter extends GenDecl
{
  name: string;
  body: string[];

  constructor(name: string, body: string[] = []){
    super();
    this.name = name;
    this.body = body;
  }
  output(){
    return [`get ${this.name}(){`, ...this.body, `}`];
  }
}
export class GenPropertySetter extends GenDecl
{
  name: string;
  type: GenType;
  body: string[];

  constructor(name: string, type: GenType, body: string[] = []){
    super();
    this.name = name;
    this.type = type;
    this.body = body;
  }
  output(){
    return [`set ${this.name}(value: ${this.type.to_str()}){`, ...this.body, `}`];
  }
}
export class GenEnumMember extends GenDecl
{
  name: string;
  value: any;

  constructor(name: string, value?: any){
    super();
    this.name = name;
    this.value = value;
  }
  output(): string[] {
    return [
      this.value !== undefined ? `${this.name} = ${JSON.stringify(this.value)},` : `${this.name},`
    ];
  }
}
export class GenEnum extends GenDecl
{
  is_exported = false;
  output_all_set = false;
  name: string;
  members: GenEnumMember[];
  decls: GenDecl[] = [];
  
  constructor(name: string)
  {
    super();
    this.name = name;
    this.members = [];
  }
  add(name: string, ...tags: GenTag[]){
    const member = new GenEnumMember(name);
    if(tags.length)member.add_tag(...tags);
    this.members.push(member);
  }
  add_with_value(name: string, value: any, ...tags: GenTag[]){
    const member = new GenEnumMember(name, value);
    if(tags.length)member.add_tag(...tags);
    this.members.push(member);
  }

  output(): string[] {
    const output = [];
    output.push(`${this.is_exported ? 'export ':''}enum ${this.name} {`);
    for(let member of this.members)
    {
      output.push(...member.output());
    }
    output.push(`}`);
    if(this.output_all_set) {
      output.push(`${this.is_exported ? 'export ':''}namespace ${this.name} {`);
      output.push(`${this.is_exported ? 'export ':''} const all = () : ${this.name}[] => ([`);
      for(let member of this.members)
      {
        output.push(`${this.name}.${member.name},`);
      }
      output.push(`]);`);
      output.push(`${this.is_exported ? 'export ':''}const set = new Set(all());`);
      for(let decl of this.decls)
      {
        if(decl instanceof GenMethod)decl.needs_function = true;
        if(decl instanceof GenMethod)decl.is_static = false;
        if(decl instanceof GenMethod)decl.is_exported = this.is_exported;
        output.push(...decl.output());
      }
      output.push(`}`);
    }
    return output;
  }
}
export class GenClass extends GenDecl
{
  is_exported = false;
  is_type = false;
  name: string;
  decls: GenDecl[];

  constructor(name: string)
  {
    super();
    this.name = name;
    this.decls = [];
  }
  output(): string[]
  {
    const output = [];
    if(this.is_type) {
      output.push(`${this.is_exported ? 'export ':''}type ${this.name} = {`);
    } else {
      output.push(`${this.is_exported ? 'export ':''}class ${this.name} {`);
    }
    for(let decl of this.decls)
    {
      if(decl instanceof GenAttr) {
        decl.for_type = true;
      }
      output.push(...decl.output());
    }
    output.push(`}`);
    return output;
  }
}
export class GenGVar extends GenDecl
{
  name: string;
  type: GenType | null;
  value: string | null;
  is_exported = false;
  is_const = true;

  constructor(name: string, value: string, type?: GenType){
    super();
    this.name = name;
    this.type = type || null;
    this.value = value;
  }
  output(){
    const output = [ ];
    output.push(
      `${this.is_exported?'export ':''}`+
      `${this.is_const?'const ':'let '}`+
      `${this.name}`+
      `${this.type ? `: `+this.type.to_str() : ''}`+
      `${this.value ? ` = `+this.value : ''};`
    );
    return output;
  }
}
export class GenTypeRaw extends GenDecl
{
  name: string;
  raw_value: string;
  is_exported = false;

  constructor(name: string, raw_value: string){
    super();
    this.name = name;
    this.raw_value = raw_value;
  }
  output(){
    const output = [ ];
    output.push(
      `${this.is_exported?'export ':''}`+
      `type ${this.name} = ${this.raw_value};`
    );
    return output;
  }
}

class _FileGroup extends GenDecl{
  type: string;
  constructor(type: string){
    super();
    this.type = type;
  }
  output(): string[] {
    throw new Error('Method not implemented.');
  }
}
export class GenFile
{
  private ctx: GenCtx;
  path: string;
  skip_generation = false;
  _decls: GenDecl[];
  imports: {path: string, identifiers: string[]}[];

  constructor(ctx: GenCtx, path: string){
    this.ctx = ctx;
    this.path = path;
    this._decls = [];
    this.imports = [];
  }
  get decls(){return this._decls.filter(d => !(d instanceof _FileGroup));}
  async output(){
    if(this.skip_generation)return;
    const output = [];
    output.push("/// AUTO GENERATED");
    for(let imp of this.imports)
    {
      let path = imp.path.replace(/\\/g, "/");
      if(path.endsWith(".ts"))path = path.slice(0, -3);
      output.push(`import {${imp.identifiers.join(", ")}} from "${path}";`);
    }
    output.push("");
    
    let is_in_group = false;
    for(let decl of this._decls)
    {
      if(decl instanceof _FileGroup) {
        if(decl.type === 'begin_group')is_in_group = true;
        if(decl.type === 'end_group') {
          is_in_group = false;
          output.push("");
        }
      } else {
        output.push(...decl.output());
        if(!is_in_group){
          output.push("");
        }
      }
    }
    const file_data = output.join("\r\n");
    await fs.promises.writeFile(this.path, file_data, 'utf-8');
  }

  add_rel_import(target_path: string, identifiers: string[]){
    let rel_path = path.relative(path.dirname(this.path), path.join(this.ctx.project_dir, target_path));
    if(!rel_path.startsWith("./")&&!rel_path.startsWith("../"))rel_path = './'+rel_path;
    this.imports.push({path: rel_path, identifiers});
  }
  add_class(name: string, is_exported = false){
    const cls = new GenClass(name);
    cls.is_exported = is_exported;
    this._decls.push(cls);
    return cls;
  }
  add_type(name: string, is_exported = false){
    const typ = new GenClass(name);
    typ.is_type = true;
    typ.is_exported = is_exported;
    this._decls.push(typ);
    return typ;
  }
  add_enum(name: string, is_exported = false){
    const enm = new GenEnum(name);
    enm.is_exported = is_exported;
    this._decls.push(enm);
    return enm;
  }
  add_const_g_var(name: string, value: string, type?: GenType){
    const g_var = new GenGVar(name, value, type);
    g_var.is_const = true;
    g_var.is_exported = true;
    this._decls.push(g_var);
    return g_var;
  }
  add_type_raw(name: string, raw_value: string, exported = false){
    const type = new GenTypeRaw(name, raw_value);
    type.is_exported = exported;
    this._decls.push(type);
    return type;
  }
  begin_group(){this._decls.push(new _FileGroup('begin_group'));}
  end_group(){this._decls.push(new _FileGroup('end_group'));}
}

export class GenTag
{
  name: string;
  data?: any;
  constructor(name: string, data?: any){
    this.name = name;
    this.data = data;
  }
}

export abstract class GenProc
{
  ctx: GenCtx;
  constructor(ctx: GenCtx)
  {
    this.ctx = ctx;
  }
}
export class GenCtx
{
  constructor(public project_dir: string){
  }

  * iterate_tagged(tag: GenTag) 
  {
    for(let file of this.files)
    {
      for(let decl of file.decls)
      {
        if(decl._tags.has(tag.name))
        {
          yield decl;
        }
      }
    }
  }
  files: GenFile[] = [];
  decls = new Map<string, GenDecl>();

  file(filename: string){
    const file_path = path.join(this.project_dir, filename+'.ts');
    const file = new GenFile(this, file_path);
    this.files.push(file);
    return file;
  }
  end_phase(){
    for(let file of this.files)
    {
      for(let decl of file.decls)
      {
        if(decl instanceof GenClass || decl instanceof GenEnum || decl instanceof GenMethod)
        {
          this.decls.set(decl.name, decl);
        }
      }
    }
  }
  query_decl(name: string){
    return this.decls.get(name);
  }
  async output() {
    for(let file of this.files)
    {
      await file.output();
    }
  }
}

