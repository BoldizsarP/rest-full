import { PathObject } from "@bunnio/type-guardian/dist/yaml-tools/collectors/YamlPaths";

export type DescriptorResponses<T> = "responses" extends keyof T
  ? T["responses"]
  : undefined;

export type GetResponse<T> = "200" extends keyof T
  ? T["200"]
  : "201" extends keyof T
  ? T["201"]
  : any;

export type PostResponse<T> = "201" extends keyof T
  ? T["201"]
  : "200" extends keyof T
  ? T["200"]
  : any;
export type PutResponse<T> = "200" extends keyof T
  ? T["200"]
  : "201" extends keyof T
  ? T["201"]
  : any;
type GetKeys = Pick<PathObject, "get" | "options" | "head">;
type PutKeys = Pick<PathObject, "delete" | "patch" | "put">;
type PostKeys = Pick<PathObject, "post">;

export type ResponseFinder<
  T,
  method extends keyof Pick<
    PathObject,
    "get" | "delete" | "options" | "patch" | "post" | "put" | "trace" | "head"
  >
> = method extends keyof GetKeys
  ? GetResponse<T>
  : method extends keyof PutKeys
  ? PutResponse<T>
  : method extends keyof PostKeys
  ? PostResponse<T>
  : "any";
