import mongodb = require('mongodb');

interface ConnectionOptions {
  client?: mongodb.MongoClient;
  clientFactory?: (url: string, opts: mongodb.MongoClientOptions) => Promise<mongodb.MongoClient>;
}

type ObjectId = string | mongodb.ObjectId;

type PlainObject = { [name: string]: any };

type DefaultSchema = PlainObject;

// type helper: `T extends ModelStatic` ensures `T` is a class that can be instantiated.
interface ModelStatic {
  new(fields?: any): any;
}

export interface ModelBag {
  [name: string]: any;
}

export class Connection<TModels extends ModelBag = { [name: string]: typeof Model }> {
  constructor(options?: ConnectionOptions);

  connect(url: string, opts?: mongodb.MongoClientOptions): Promise<void>;

  collection(name: string): mongodb.Collection;

  readonly models: TModels;
  define(models: Partial<TModels>): void;
}

export class Model<TSchema = DefaultSchema> {
  public fields: TSchema;

  constructor(fields?: TSchema);

  /**
   *
   */
  readonly connection: Connection;

  /**
   * The mongodb collection this model belongs to.
   */
  readonly collection: mongodb.Collection;

  validate(): Promise<void> | void;
  save(): Promise<void>;

  toJSON(): { [name: string]: any };

  static getCollection(): mongodb.Collection;

  // TModelClass can be _any_ class type in theory, but since it's inferred from the `this` type,
  // it will be a model class in all typical uses.
  static findById<TModelClass extends ModelStatic>(this: TModelClass, id: ObjectId): Promise<InstanceType<TModelClass>>;
  static find<TModelClass extends ModelStatic>(this: TModelClass, query?: object): QueryBuilder<InstanceType<TModelClass>>;
  static aggregate<TModelClass extends ModelStatic>(this: TModelClass, stages?: object[]): AggregateBuilder<InstanceType<TModelClass>>;
  static hydrate<TModelClass extends ModelStatic>(this: TModelClass, fields: InstanceType<TModelClass>["fields"]): InstanceType<TModelClass>;
  static hydrateAll<TModelClass extends ModelStatic>(this: TModelClass, documents: InstanceType<TModelClass>["fields"][]): InstanceType<TModelClass>[];

  static set connection(Connection);
  static get connection(): Connection;
  static set collection(name: string);
  static get collection(): string;

  static QueryBuilder: typeof QueryBuilder;
  static AggregateBuilder: typeof AggregateBuilder;
}

type CountSchema<F extends string> = { [key in F]: number }

// TODO AggregateBuilder should not return model instances, probably?
export class AggregateBuilder<TResult extends Model> implements AsyncIterable<TResult> {
  constructor(stages: object[]);
  _model<TNewResult extends Model>(model: TNewResult): AggregateBuilder<TNewResult>;
  push(stage: object): AggregateBuilder<Model<DefaultSchema>>;
  count<F extends string>(fieldName: F): AggregateBuilder<Model<CountSchema<F>>>;
  group(fields: object): this;
  limit(n: number): this;
  match(query: QueryBuilder<TResult> | object): this;
  project(projection: object): this;
  skip(n: number): this;
  sort(fields: object): this;
  unwind<F extends string>(fieldName: F): this; // TODO flatten the unwinded field type
  unwind(spec: object): this;
  toJSON(): object[];
  execute(options?: mongodb.CollectionAggregationOptions): AggregateIterator<TResult>;
  [Symbol.asyncIterator](): AggregateIterator<TResult>;

  then<TOk>(success: (models: TResult[]) => Promise<TOk> | TOk, fail?: (err: Error) => Promise<TOk> | TOk): Promise<TOk>;
  catch<TOk>(fail: (err: Error) => Promise<TOk> | TOk): Promise<TOk | TResult[]>;
}

export class AggregateIterator<TResult extends Model> implements AsyncIterator<TResult> {
  unwrap(): mongodb.AggregationCursor;

  next(): Promise<IteratorResult<TResult>>;

  then<TOk>(success: (models: TResult[]) => Promise<TOk> | TOk, fail?: (err: Error) => Promise<TOk> | TOk): Promise<TOk>;
  catch<TOk>(fail: (err: Error) => Promise<TOk> | TOk): Promise<TOk | TResult[]>;
}

export class QueryBuilder<TResult extends Model> implements AsyncIterable<TResult> {
  constructor(query?: object);
  _model<TNewResult extends Model>(model: TNewResult): QueryBuilder<TNewResult>;
  where(query: object): this;
  eq<F extends keyof TResult["fields"]>(field: F, val: TResult["fields"][F]): this;
  neq<F extends keyof TResult["fields"]>(field: F, val: TResult["fields"][F]): this;
  gt<F extends keyof TResult["fields"]>(field: F, val: TResult["fields"][F]): this;
  gte<F extends keyof TResult["fields"]>(field: F, val: TResult["fields"][F]): this;
  lt<F extends keyof TResult["fields"]>(field: F, val: TResult["fields"][F]): this;
  lte<F extends keyof TResult["fields"]>(field: F, val: TResult["fields"][F]): this;
  and(branches: (QueryBuilder<TResult> | PlainObject)[]): this;
  or(branches: (QueryBuilder<TResult> | PlainObject)[]): this;
  select<F extends keyof TResult["fields"]>(...fields: (F | F[])[]): this;
  toJSON(): object;
  execute(options?: mongodb.FindOneOptions): QueryIterator<TResult>;
  [Symbol.asyncIterator](): QueryIterator<TResult>;

  then<TOk>(success: (models: TResult[]) => Promise<TOk> | TOk, fail?: (err: Error) => Promise<TOk> | TOk): Promise<TOk>;
  catch<TOk>(fail: (err: Error) => Promise<TOk> | TOk): Promise<TOk | TResult[]>;
}

export class QueryIterator<TResult extends Model> implements AsyncIterator<TResult> {
  unwrap(): mongodb.Cursor;

  next(): Promise<IteratorResult<TResult>>;

  then<TOk>(success: (models: TResult[]) => Promise<TOk> | TOk, fail?: (err: Error) => Promise<TOk> | TOk): Promise<TOk>;
  catch<TOk>(fail: (err: Error) => Promise<TOk> | TOk): Promise<TOk | TResult[]>;
}
