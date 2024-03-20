import { YAMLDocumentStructure } from "@bunnio/type-guardian/dist/types";
import { DeepReadonly } from "../interface-shortcuts/readonly";
import {
  RefType,
  YamlDict,
} from "@bunnio/type-guardian/dist/yaml-tools/schema/interface";
import {
  OperationObject,
  PathObject,
} from "@bunnio/type-guardian/dist/yaml-tools/collectors/YamlPaths";
import { SecuritySchema } from "@bunnio/type-guardian/dist/yaml-tools/securitySchemes/interface";

export class YamlNavigator {
  source: DeepReadonly<YAMLDocumentStructure>;
  constructor(source: DeepReadonly<YAMLDocumentStructure>) {
    this.source = source;
  }

  getSecuritySchema(
    schemaName: string
  ): DeepReadonly<SecuritySchema> | undefined {
    const securities = this.source.components?.securitySchemes;
    if (!securities) return undefined;

    if (schemaName in securities) {
      return this.resolveRef(securities[schemaName]);
    }
    return undefined;
  }

  refSanity(ref: string) {
    return ref.split("#/")[0].length === 0;
  }
  goRef<T extends DeepReadonly<YamlDict>>(ref: string) {
    const pathTo = ref.split("/").filter((_, i) => i > 0);
    return pathTo.reduce<T>((res, key) => {
      if (typeof res === "object" && key in res) return res[key] as T;
      throw Error(`Ref path is not solvable ${ref}`);
    }, this.source as unknown as T);
  }
  goBottomRef<T extends DeepReadonly<YamlDict>>(ref: string): T {
    if (!this.refSanity(ref)) throw Error(`Ref ${ref} is not a local ref!`);
    const newData = this.goRef<T | RefType>(ref);
    if (newData.$ref) return this.goBottomRef(newData.$ref as string);
    return newData as T;
  }
  resolveRef<T extends DeepReadonly<YamlDict>>(
    data: T | DeepReadonly<RefType>
  ): T {
    if (data.$ref) return this.goBottomRef<T>(data.$ref as string);
    return data as T;
  }
  getContext(
    path: string,
    method:
      | keyof Pick<
          PathObject,
          | "get"
          | "put"
          | "post"
          | "delete"
          | "options"
          | "head"
          | "patch"
          | "trace"
        >
  ): {
    path: DeepReadonly<PathObject>;
    OperationObject: DeepReadonly<OperationObject>;
    rootSecurity: DeepReadonly<YAMLDocumentStructure>["security"];
  } {
    const pathData = this.source.paths ? this.source.paths[path] : undefined;
    if (!pathData) {
      throw Error(
        "Path context could not be retrieved" + `${path} -> ${method}`
      );
    }
    const methodData = pathData[method];
    if (!methodData) {
      throw Error(
        "Method context could not be retrieved" + `${path} -> ${method}`
      );
    }
    return {
      path: pathData,
      OperationObject: methodData,
      rootSecurity: this.source.security,
    };
  }
}
