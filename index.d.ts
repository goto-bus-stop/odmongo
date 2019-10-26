import mongodb = require('mongodb')

interface ConnectionOptions {
  client?: mongodb.MongoClient
  clientFactory?: (
    url: string,
    opts: mongodb.MongoClientOptions
  ) => Promise<mongodb.MongoClient>
}

type ObjectId = string | mongodb.ObjectId

type PlainObject = { [name: string]: any }

type UnknownObject = { [name: string]: unknown }

type DefaultSchema = PlainObject

// type helper: `T extends ModelStatic` ensures `T` is a class that can be instantiated.
interface ModelStatic {
  new (fields?: any): any
}

// `ModelFields<User>` is the type of `User#fields`.
type ModelFields<T extends ModelStatic> = InstanceType<T>['fields']

interface ModelBag {
  [name: string]: any
}

export class Connection<
  TModels extends ModelBag = { [name: string]: typeof Model }
> {
  constructor(options?: ConnectionOptions)

  connect(url: string, opts?: mongodb.MongoClientOptions): Promise<void>

  collection(name: string): mongodb.Collection

  readonly models: TModels
  define(models: Partial<TModels>): void
}

export class Model<TFields = DefaultSchema> {
  public fields: TFields

  constructor(fields?: TFields)

  /**
   *
   */
  readonly connection: Connection

  /**
   * The mongodb collection this model belongs to.
   */
  readonly collection: mongodb.Collection

  validate(): Promise<void> | void
  save(): Promise<void>

  toJSON(): { [name: string]: any }

  static getCollection(): mongodb.Collection

  // TModelClass can be _any_ class type in theory, but since it's inferred from the `this` type,
  // it will be a model class in all typical uses.
  static findById<TModelClass extends ModelStatic>(
    this: TModelClass,
    id: ObjectId
  ): Promise<InstanceType<TModelClass>>
  static find<TModelClass extends ModelStatic>(
    this: TModelClass,
    query?: PlainObject
  ): Query<InstanceType<TModelClass>>
  static aggregate<TModelClass extends ModelStatic>(
    this: TModelClass,
    stages?: PlainObject[]
  ): AggregateBuilder<ModelFields<TModelClass>>
  static hydrate<TModelClass extends ModelStatic>(
    this: TModelClass,
    fields: ModelFields<TModelClass>
  ): InstanceType<TModelClass>
  static hydrateAll<TModelClass extends ModelStatic>(
    this: TModelClass,
    documents: ModelFields<TModelClass>[]
  ): InstanceType<TModelClass>[]

  static set connection(Connection)
  static get connection(): Connection
  static set collection(name: string)
  static get collection(): string

  static QueryBuilder: typeof Query
  static AggregateBuilder: typeof AggregateBuilder
}

// Aggregation argument and result types:

interface AddFieldsOptions {
  [key: string]: any
}
// Apply an $addFields aggregation stage on the type level.
type ApplyFields<Base, Fields extends AddFieldsOptions> = Base &
  { [F in keyof Fields]: any }

// Apply a $count aggregation stage on the type level.
// Replaces the result type by `{ $OutputName: number }`.
type ApplyCount<OutputName extends string> = {
  [key in OutputName]: number
}

interface FacetOptions<Input extends object> {
  [key: string]:
    | ((input: AggregateBuilder<Input>) => any)
    | AggregateBuilder<any> // not sure if this should be allowed in typescript
    | PlainObject[]
}
// Apply a $facet aggregation stage on the type level.
type ApplyFacet<Input extends object, Facets extends FacetOptions<Input>> = {
  [F in keyof Facets]: Facets[F] extends AggregateBuilder<infer Output>
    ? Output[]
    : Facets[F] extends (
        input: AggregateBuilder<Input>
      ) => AggregateBuilder<infer Output>
    ? Output[]
    : PlainObject[]
}

// Source collection for a $lookup
type LookupFrom = string | ModelStatic
// type restrictions for a simple lookup ({localField, foreignField})
type SimpleLookupOptions<
  Input extends object,
  JoinCollection extends LookupFrom,
  OutputName extends string
> = {
  from: JoinCollection
  as: OutputName
  localField: keyof Input
  foreignField: JoinCollection extends ModelStatic
    ? keyof ModelFields<JoinCollection>
    : string
}
// type restrictions for a pipeline lookup ({let, pipeline})
type PipelineLookupOptions<
  Input extends object,
  JoinCollection extends LookupFrom,
  OutputName extends string
> = {
  from: JoinCollection
  as: OutputName
  let: object
  // TODO accept `pipeline: (input) => input.etc()`?
  pipeline: JoinCollection extends ModelStatic ? UnknownObject[] : UnknownObject[]
}

type LookupOptions<
  Input extends object,
  JoinCollection extends LookupFrom,
  OutputName extends string
> =
  | SimpleLookupOptions<Input, JoinCollection, OutputName>
  | PipelineLookupOptions<Input, JoinCollection, OutputName>

type ApplySimpleLookup<
  Input extends object,
  JoinCollection extends LookupFrom,
  OutputName extends string
> = Input &
  {
    [key in OutputName]: JoinCollection extends ModelStatic
      ? ModelFields<JoinCollection>[]
      : UnknownObject[]
  }

type ApplyUnwind<Input extends object, Field extends keyof Input> = Omit<
  Input,
  Field
> &
  {
    [key in Field]: Input[key] extends (infer Element)[] ? Element : Input[key]
  }

type ProjectOptions<Input extends object> = {
  [Field in keyof Input]?: 0 | 1
}
type ApplyProjection<
  Input extends object,
  Projection extends ProjectOptions<Input>
> = {
  [Field in keyof Input]: Projection[Field] extends 0
    ? never
    : Projection[Field] extends 1
    ? Input[Field]
    : Input[Field] | undefined
}

export class AggregateBuilder<TResult extends object>
  implements AsyncIterable<TResult> {
  constructor(stages: PlainObject[])
  push<TNewResult extends object = PlainObject>(
    stage: object
  ): AggregateBuilder<TNewResult>
  addFields<TFields extends AddFieldsOptions>(
    fields: TFields
  ): AggregateBuilder<ApplyFields<TResult, TFields>>
  count<F extends string>(fieldName: F): AggregateBuilder<ApplyCount<F>>
  group(fields: object): this
  match(query: QueryBuilder<TResult> | object): this
  project<TProjection extends ProjectOptions<TResult>>(
    projection: TProjection
  ): AggregateBuilder<ApplyProjection<TResult, TProjection>> // TODO can we determine this in some cases?
  skip(n: number): this
  limit(n: number): this
  sort(fields: object): this
  unwind<F extends keyof TResult>(
    fieldName: F,
    options?: {
      includeArrayIndex?: string
      preserveNullAndEmptyArrays?: boolean
    }
  ): AggregateBuilder<ApplyUnwind<TResult, F>>
  unwind(spec: {
    path: string
    includeArrayIndex: string
    preserveNullAndEmptyArrays: boolean
  }): AggregateBuilder<object>
  facet<TFacets extends FacetOptions<TResult>>(
    facets: TFacets
  ): AggregateBuilder<ApplyFacet<TResult, TFacets>>
  // TODO return type for PipelineLookupOptions
  lookup<From extends LookupFrom, F extends string>(
    spec: LookupOptions<TResult, From, F>
  ): AggregateBuilder<ApplySimpleLookup<TResult, From, F>>
  // lookup(spec: object): this;
  replaceRoot<F extends keyof TResult>(
    fieldName: F
  ): AggregateBuilder<TResult[F] extends object ? TResult[F] : object>
  toJSON(): UnknownObject[]
  execute(
    options?: mongodb.CollectionAggregationOptions
  ): AggregateIterator<TResult>
  [Symbol.asyncIterator](): AggregateIterator<TResult>

  then<TOk>(
    success: (models: TResult[]) => Promise<TOk> | TOk,
    fail?: (err: Error) => Promise<TOk> | TOk
  ): Promise<TOk>
  catch<TOk>(fail: (err: Error) => Promise<TOk> | TOk): Promise<TOk | TResult[]>
}

export class AggregateIterator<TResult extends object>
  implements AsyncIterator<TResult> {
  unwrap(): mongodb.AggregationCursor

  next(): Promise<IteratorResult<TResult>>

  then<TOk>(
    success: (models: TResult[]) => Promise<TOk> | TOk,
    fail?: (err: Error) => Promise<TOk> | TOk
  ): Promise<TOk>
  catch<TOk>(fail: (err: Error) => Promise<TOk> | TOk): Promise<TOk | TResult[]>
}

export class QueryBuilder<TResult extends object> {
  constructor(query?: object)
  where(query: object): this
  eq<F extends keyof TResult>(field: F, val: TResult[F]): this
  neq<F extends keyof TResult>(field: F, val: TResult[F]): this
  gt<F extends keyof TResult>(field: F, val: TResult[F]): this
  gte<F extends keyof TResult>(field: F, val: TResult[F]): this
  lt<F extends keyof TResult>(field: F, val: TResult[F]): this
  lte<F extends keyof TResult>(field: F, val: TResult[F]): this
  and(branches: (QueryBuilder<TResult> | PlainObject)[]): this
  or(branches: (QueryBuilder<TResult> | PlainObject)[]): this
  select<F extends keyof TResult>(...fields: (F | F[])[]): this
  toJSON(): UnknownObject
}

export class Query<TModel extends Model> extends QueryBuilder<TModel['fields']>
  implements AsyncIterable<TModel> {
  constructor(query?: object)
  _model<TNewResult extends Model>(model: TNewResult): Query<TNewResult>
  execute(options?: mongodb.FindOneOptions): QueryIterator<TModel>
  [Symbol.asyncIterator](): QueryIterator<TModel>

  then<TOk>(
    success: (models: TModel[]) => Promise<TOk> | TOk,
    fail?: (err: Error) => Promise<TOk> | TOk
  ): Promise<TOk>
  catch<TOk>(fail: (err: Error) => Promise<TOk> | TOk): Promise<TOk | TModel[]>
}

export class QueryIterator<TResult extends Model>
  implements AsyncIterator<TResult> {
  unwrap(): mongodb.Cursor

  next(): Promise<IteratorResult<TResult>>

  then<TOk>(
    success: (models: TResult[]) => Promise<TOk> | TOk,
    fail?: (err: Error) => Promise<TOk> | TOk
  ): Promise<TOk>
  catch<TOk>(fail: (err: Error) => Promise<TOk> | TOk): Promise<TOk | TResult[]>
}
