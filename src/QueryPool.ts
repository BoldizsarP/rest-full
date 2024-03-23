import {
  Descriptor,
  YAMLDocumentStructure,
} from "@bunnio/type-guardian/dist/types";
import { ZodAny, ZodFirstPartySchemaTypes, ZodTypeAny, z } from "zod";
import { DeepReadonly } from "./interface-shortcuts/readonly";
import { DescriptorBodies } from "./interface-shortcuts/requestBody/interface";
import axios, { AxiosHeaders, AxiosPromise, AxiosRequestConfig } from "axios";
import {
  OperationObject,
  PathObject,
} from "@bunnio/type-guardian/dist/yaml-tools/collectors/YamlPaths";
import {
  MediaTypeObject,
  RequestBodies,
} from "@bunnio/type-guardian/dist/yaml-tools/requestBodies/interface";
import { YamlNavigator } from "./lookup-navigator/navigator";
import {
  HeaderParameter,
  PathParameter,
  QueryParameter,
  TrueParameterType,
} from "@bunnio/type-guardian/dist/yaml-tools/parameters/interface";
import { DescriptorParameters } from "./interface-shortcuts/parameters/interface";
import {
  pathLabelEncode,
  pathMatrixEncode,
  pathSimpleEncode,
} from "./parameter-tools/pathParameter";
import {
  queryFormSerializer,
  querySpaceDelimitedSerializer,
  queryPipeDelimitedSerializer,
  queryDeepObjectSerializer,
} from "./parameter-tools/queryParameter";
import { headerSimpleEncode } from "./parameter-tools/headerParameters";
import {
  SecurityRequirements,
  SecuritySchema,
} from "@bunnio/type-guardian/dist/yaml-tools/securitySchemes/interface";
import {
  DescriptorResponses,
  ResponseFinder,
} from "./interface-shortcuts/response/interface";

function styleToPrefix(style: "simple" | "label" | "matrix") {
  switch (style) {
    case "simple":
      return "";
    case "label":
      return ".";
    case "matrix":
      return ";";
    default:
      throw Error("Style is not path style!" + `<${style}>`);
  }
}
type DefaultContext<T> = {
  requestData: T & { url: string };
  queryParameterChain: string[];
  headers: [string, string][];
  lookup: {
    path: DeepReadonly<PathObject>;
    rootSecurity?: DeepReadonly<YAMLDocumentStructure["security"]>;
    OperationObject: DeepReadonly<OperationObject>;
  };
  method: keyof Pick<
    PathObject,
    "get" | "delete" | "options" | "patch" | "post" | "put" | "trace" | "head"
  >;
};
function defaultContextMaker<T>(data: any): T {
  return data;
}

export class QueryPool<
  ZodPath extends Descriptor<ZodFirstPartySchemaTypes>["paths"],
  InterfacePath extends Descriptor<any>["paths"],
  Lookup extends DeepReadonly<YAMLDocumentStructure>,
  Body extends AxiosRequestConfig = AxiosRequestConfig,
  Context extends DefaultContext<Body> = DefaultContext<Body>
> {
  zodPath: ZodPath;
  lookUp: Lookup;
  silentError;
  axiosStarter;
  strictEncoding;
  navigator;
  pathSimpleEncode;
  pathLabelEncode;
  pathMatrixEncode;
  queryFormSerializer;
  querySpaceDelimitedSerializer;
  queryPipeDelimitedSerializer;
  queryDeepObjectSerializer;
  contextMaker;
  headerSimpleEncode;
  globalSecurityHandler;
  lookupSecurityHandler;
  warnOnCookies;
  throwOnSecurityMissing;
  additionalBodyParser;
  constructor(
    zodPath: ZodPath,
    lookUp: Lookup,
    settings?: {
      contextMaker?: (starter: DefaultContext<Body>) => Context;
      silentError?: boolean;
      //   Multipart encoding strictness, does not get affected by silentError
      strictEncoding?: boolean;
      warnOnCookies?: boolean;
      throwOnSecurityMissing?: boolean;
      defaultSettings?: (() => Body) | Body;
      globalSecurityHandler?: (
        security: DeepReadonly<SecuritySchema>,
        scopes: DeepReadonly<string[]>,
        name: string,
        fullSecurity: DeepReadonly<SecurityRequirements>,
        context: Context
      ) => void;
      lookupSecurityHandler?: (
        security: DeepReadonly<SecuritySchema>,
        scopes: DeepReadonly<string[]>,
        name: string,
        fullSecurity: DeepReadonly<SecurityRequirements>,
        context: Context
      ) => void;
      additionalBodyParser?: {
        [key: Exclude<string, "application/json" | "multipart/form-data">]: <
          P extends keyof InterfacePath & string,
          M extends keyof InterfacePath[P] &
            string &
            (
              | "get"
              | "put"
              | "post"
              | "delete"
              | "options"
              | "head"
              | "patch"
              | "trace"
            ),
          Bodies extends DescriptorBodies<InterfacePath[P][M]>,
          BodyKey extends Bodies extends undefined
            ? undefined
            : keyof Bodies & string,
          Content extends BodyKey extends keyof Bodies
            ? Bodies[BodyKey]
            : undefined
        >(
          path: P,
          method: M,
          bodyKey: BodyKey,
          requestContent: Content,
          context: Context
        ) => void;
      };
    }
  ) {
    this.zodPath = zodPath;
    this.lookUp = lookUp;
    this.silentError = settings?.silentError;
    this.axiosStarter = settings?.defaultSettings ?? ({} as Body);
    this.strictEncoding = settings?.strictEncoding;
    this.navigator = new YamlNavigator(lookUp);
    this.warnOnCookies = settings?.warnOnCookies ?? false;
    this.pathSimpleEncode = pathSimpleEncode;
    this.pathLabelEncode = pathLabelEncode;
    this.pathMatrixEncode = pathMatrixEncode;
    this.queryFormSerializer = queryFormSerializer;
    this.querySpaceDelimitedSerializer = querySpaceDelimitedSerializer;
    this.queryPipeDelimitedSerializer = queryPipeDelimitedSerializer;
    this.queryDeepObjectSerializer = queryDeepObjectSerializer;
    this.contextMaker = settings?.contextMaker ?? defaultContextMaker<Context>;
    this.headerSimpleEncode = headerSimpleEncode;
    this.globalSecurityHandler = settings?.globalSecurityHandler;
    this.lookupSecurityHandler = settings?.lookupSecurityHandler;
    this.throwOnSecurityMissing = settings?.throwOnSecurityMissing ?? true;
    this.additionalBodyParser = settings?.additionalBodyParser;
  }

  //   Since there is only 1 request body per request,
  //   it makes no sense to return all,
  //   but it is beneficial to make sure the selected payload is supported
  getBodyZod<
    P extends keyof InterfacePath & keyof ZodPath & string,
    M extends keyof InterfacePath[P] & keyof ZodPath[P] & string,
    Bodies extends DescriptorBodies<ZodPath[P][M]> | never,
    BodyKey extends Bodies extends never ? never : keyof Bodies
  >(
    path: P,
    method: M,
    key: BodyKey
  ): BodyKey extends never ? undefined : ZodPath[P][M]["requestBody"][BodyKey] {
    if (this.zodPath[path][method]["requestBody"])
      return this.zodPath[path][method]["requestBody"]![key] as any;

    throw Error(
      "Zod is searched but not found on " + `${path} ${method} ${key}`
    );
  }
  getPathZod<
    P extends keyof InterfacePath & keyof ZodPath & string,
    M extends keyof InterfacePath[P] & keyof ZodPath[P] & string
  >(path: P, method: M): ZodPath[P][M] {
    if (this.zodPath[path][method]["requestBody"])
      return this.zodPath[path][method] as any;

    throw Error("Zod is searched but not found on " + `${path} ${method} `);
  }

  //   OverWrite this to support additional encoding types for multipart formData
  encodeFormData(
    formData: FormData,
    key: string,
    data: any,
    encoding: "application/json" | "file" | "fileList" | string
  ) {
    switch (encoding) {
      case "application/json":
        formData.append(key, JSON.stringify(data));
        break;
      case "file":
        formData.append(key, data as File);
        break;
      case "fileList":
        if (Array.isArray(data)) {
          data.forEach((f) => {
            formData.append(key, f as File);
          });
          break;
        }
      default:
        throw Error("Couldn't encode data!");
    }
  }

  //    Simple multipart encoder that calls the underlying "encodeData" function on each top level entry
  //    This components inherintly supports File data objects, and sets them accordingly
  //    TODO add support for base64 file encoding
  multipartify(
    data: { [key: string]: any },
    lookup: DeepReadonly<MediaTypeObject>
  ): FormData {
    const formData = new FormData();
    if (!lookup.encoding && this.strictEncoding)
      throw Error(
        "Encoding was not provided, but multipart form data is used!"
      );
    const encoding = lookup.encoding ?? {};
    Object.keys(data).map((entryKey) => {
      const entry = data[entryKey];
      if (entry instanceof File) {
        const contenType =
          entryKey in encoding ? encoding[entryKey].contentType : "file";
        if (contenType) {
          this.encodeFormData(formData, entryKey, entry, contenType);
          return;
        } else {
          if (this.strictEncoding)
            throw Error(`Key ${entryKey} has no proper encoding type`);
        }
      } else if (
        Array.isArray(entry) &&
        entry.length > 0 &&
        entry[0] instanceof File
      ) {
        const contenType =
          entryKey in encoding ? encoding[entryKey].contentType : "fileList";
        if (contenType) {
          if (contenType == "fileList")
            this.encodeFormData(formData, entryKey, entry, contenType);
          else
            entry.forEach((sF) =>
              this.encodeFormData(formData, entryKey, sF, contenType)
            );
          return;
        } else {
          if (this.strictEncoding)
            throw Error(`Key ${entryKey} has no proper encoding type`);
        }
      } else {
        const contenType =
          entryKey in encoding
            ? encoding[entryKey].contentType
            : "application/json";
        if (contenType) {
          this.encodeFormData(formData, entryKey, entry, contenType);
          return;
        } else {
          if (this.strictEncoding)
            throw Error(`Key ${entryKey} has no proper encoding type`);
        }
      }
      if (this.strictEncoding)
        throw Error(`Key ${entryKey} was not properly encoded`);
    });
    return formData;
  }

  parseBody<
    P extends keyof InterfacePath & string,
    M extends keyof InterfacePath[P] &
      string &
      (
        | "get"
        | "put"
        | "post"
        | "delete"
        | "options"
        | "head"
        | "patch"
        | "trace"
      ),
    Bodies extends DescriptorBodies<InterfacePath[P][M]>,
    BodyKey extends Bodies extends undefined
      ? undefined
      : keyof Bodies & string,
    Content extends BodyKey extends keyof Bodies ? Bodies[BodyKey] : undefined
  >(
    path: P,
    method: M,
    bodyKey: BodyKey,
    requestContent: Content,
    context: Context
  ): Body {
    if (!requestContent) throw Error("No content to encode!");
    if (!bodyKey) throw Error("No bodyKey set!");
    const lookupReqBody = context.lookup.OperationObject.requestBody;
    if (!lookupReqBody) throw Error(`${path} and ${method} has no lookup!`);
    switch (bodyKey) {
      case "application/json":
        context.requestData.data = requestContent;
        break;
      case "multipart/form-data":
        const bk = bodyKey as "multipart/form-data";
        const multipartLookup =
          this.navigator.resolveRef<DeepReadonly<RequestBodies>>(lookupReqBody);

        context.requestData.data = this.multipartify(
          requestContent,
          multipartLookup.content[bk]
        );
        break;

      default:
        if (this.additionalBodyParser) {
          if (bodyKey in this.additionalBodyParser) {
            const fn = this.additionalBodyParser[bodyKey];
            fn<P, M, Bodies, BodyKey, Content>(
              path,
              method,
              bodyKey,
              requestContent,
              context
            );
          }
        }
        throw Error("No encoder supported for request Body=" + `${bodyKey}`);
    }

    return context.requestData;
  }

  // For the sake of simplicity, and my personal sanitiy, we assume that all path variables are primitive,
  // or are a combination of primitive objects/arrays, that can be serialized by simply converting to string
  // Example for serialization: https://swagger.io/docs/specification/serialization/
  encodePathParameter(
    key: string,
    data: any,
    parameter: DeepReadonly<PathParameter>,
    context: Context
  ) {
    const mode = parameter.style ?? "simple"; // As default
    const explode = parameter.explode ?? false; // As default

    const pathKey = `\{${styleToPrefix(mode) + key + (explode ? "*" : "")}}`;

    const pathComponent = context.requestData.url.includes(pathKey)
      ? pathKey
      : context.requestData.url.includes(`\{${key}}`)
      ? key
      : undefined;
    if (!pathComponent)
      throw Error("Path couldn't be matched to known path shapes");

    switch (mode) {
      case "simple":
        context.requestData.url = context.requestData.url.replace(
          pathComponent,
          this.pathSimpleEncode(key, data, explode)
        );
        return;
      case "label":
        context.requestData.url = context.requestData.url.replace(
          pathComponent,
          this.pathLabelEncode(key, data, explode)
        );
        return;
      case "matrix":
        context.requestData.url = context.requestData.url.replace(
          pathComponent,
          this.pathMatrixEncode(key, data, explode)
        );
        return;
      default:
        throw Error(
          `Path style must be one of "simple" | "label" | "matrix"! is ${mode}`
        );
    }
  }
  // For the sake of simplicity, and my personal sanitiy, we assume that all query variables are primitive,
  // or are a combination of primitive objects/arrays, that can be serialized by simply converting to string
  // Example for serialization: https://swagger.io/docs/specification/serialization/
  encodeQueryParameter(
    key: string,
    data: any,
    parameter: DeepReadonly<QueryParameter>,
    context: Context
  ) {
    const mode = parameter.style ?? "form"; // As default
    const explode = parameter.explode ?? true; // As default

    switch (mode) {
      case "form":
        context.queryParameterChain.push(
          this.queryFormSerializer(key, data, explode)
        );
        return;
      case "spaceDelimited":
        context.queryParameterChain.push(
          this.querySpaceDelimitedSerializer(key, data, explode)
        );
        return;
      case "pipeDelimited":
        context.queryParameterChain.push(
          this.queryPipeDelimitedSerializer(key, data, explode)
        );
        return;
      case "deepObject":
        context.queryParameterChain.push(
          this.queryDeepObjectSerializer(key, data, explode)
        );
        return;

      default:
        throw Error(
          `Query style must be one of "form" | "spaceDelimited" | "pipeDelimited" | "deepObject"! is ${mode}`
        );
    }
  }
  encodeHeaderParameter(
    key: string,
    data: any,
    parameter: DeepReadonly<HeaderParameter>,
    context: Context
  ) {
    const mode = parameter.style ?? "simple"; // As default
    const explode = parameter.explode ?? true; // As default

    switch (mode) {
      case "simple":
        context.headers.push([
          key,
          this.headerSimpleEncode(key, data, explode),
        ]);
        return;

      default:
        break;
    }
    throw Error(`Header style must be one of "simple"! is ${mode}`);
  }

  parseParameters<
    P extends keyof InterfacePath & keyof ZodPath & string,
    M extends keyof InterfacePath[P] & keyof ZodPath[P],
    Parameters extends DescriptorParameters<InterfacePath[P][M]>
  >(path: P, method: M, parameters: Parameters, context: Context) {
    if (!parameters) throw Error("Rmpty Parameters called on parseParameters");

    const globalParameters =
      context.lookup.path.parameters?.map((par) =>
        this.navigator.resolveRef<DeepReadonly<TrueParameterType>>(par)
      ) ?? [];
    const localParameters =
      context.lookup.OperationObject.parameters?.map((par) =>
        this.navigator.resolveRef<DeepReadonly<TrueParameterType>>(par)
      ) ?? [];

    if ("path" in parameters) {
      const pathParamters = parameters["path"];
      const pathLookup = context.lookup.OperationObject.parameters
        ? context.lookup.OperationObject.parameters
        : undefined;
      if (pathLookup) {
      }
      if (pathParamters)
        Object.keys(pathParamters).forEach((pathKey) => {
          const lookupParameter =
            (localParameters.find(
              (par) => par.name == pathKey && par.in === "path"
            ) as DeepReadonly<PathParameter> | undefined) ??
            (globalParameters.find(
              (par) => par.name == pathKey && par.in === "path"
            ) as DeepReadonly<PathParameter> | undefined);
          if (!lookupParameter)
            throw Error(
              `Path parameter is not found in lookup! pathKey:${pathKey}`
            );
          this.encodePathParameter(
            pathKey,
            pathParamters[pathKey],
            lookupParameter,
            context
          );
        });
    }
    if ("query" in parameters) {
      const queryParamters = parameters["query"];
      const pathLookup = context.lookup.OperationObject.parameters
        ? context.lookup.OperationObject.parameters
        : undefined;
      if (pathLookup) {
      }
      if (queryParamters)
        Object.keys(queryParamters).forEach((pathKey) => {
          const lookupParameter =
            (localParameters.find(
              (par) => par.name == pathKey && par.in == "query"
            ) as DeepReadonly<QueryParameter> | undefined) ??
            (globalParameters.find(
              (par) => par.name == pathKey && par.in == "query"
            ) as DeepReadonly<QueryParameter> | undefined);
          if (!lookupParameter)
            throw Error(
              `Path parameter is not found in lookup! pathKey:${pathKey}`
            );
          this.encodeQueryParameter(
            pathKey,
            queryParamters[pathKey],
            lookupParameter,
            context
          );
        });
    }
    if ("headers" in parameters) {
      const headerParamters = parameters["headers"];
      const pathLookup = context.lookup.OperationObject.parameters
        ? context.lookup.OperationObject.parameters
        : undefined;
      if (pathLookup) {
      }
      if (headerParamters)
        Object.keys(headerParamters).forEach((pathKey) => {
          const lookupParameter =
            (localParameters.find(
              (par) => par.name == pathKey && par.in == "header"
            ) as DeepReadonly<HeaderParameter> | undefined) ??
            (globalParameters.find(
              (par) => par.name == pathKey && par.in == "header"
            ) as DeepReadonly<HeaderParameter> | undefined);
          if (!lookupParameter)
            throw Error(
              `Path parameter is not found in lookup! pathKey:${pathKey}`
            );
          this.encodeHeaderParameter(
            pathKey,
            headerParamters[pathKey],
            lookupParameter,
            context
          );
        });
    }
    if ("cookies" in parameters) {
      if (this.warnOnCookies)
        console.log(
          `Cookies are set inside the parameters, but they cannot be encoded by nature ${Object.keys(
            parameters["cookies"] ?? {}
          )}`
        );
    }
  }

  //   Return all parameters zod if existing
  getParameterZod<
    P extends keyof InterfacePath & keyof ZodPath & string,
    M extends keyof InterfacePath[P] &
      keyof ZodPath[P] &
      (
        | "get"
        | "put"
        | "post"
        | "delete"
        | "options"
        | "head"
        | "patch"
        | "trace"
      )
  >(path: P, method: M) {
    const OpZod = this.zodPath[path][method];

    if (OpZod.parameters) {
      return OpZod["parameters"];
    }
    if (this.silentError) return undefined;
    throw Error("Zod is searched but not found on " + `${path} ${method}`);
  }

  handleGlobalSecurity(context: Context) {
    const secuHandler = this.globalSecurityHandler;
    if (!secuHandler) return;
    const globalSecurities = this.lookUp["security"];
    if (!globalSecurities) return;
    globalSecurities.forEach((sec) => {
      Object.keys(sec).forEach((keyName) => {
        const secu = this.navigator.getSecuritySchema(keyName);
        if (!secu) {
          if (this.throwOnSecurityMissing)
            throw Error(`Security lookup form key ${keyName} is missing!`);
          return;
        }
        secuHandler(secu, sec[keyName], keyName, sec, context);
      });
    });
  }
  handleLocalSecurity(context: Context) {
    const secuHandler = this.lookupSecurityHandler;
    if (!secuHandler) return;
    context.lookup.OperationObject.security?.forEach((localSec) => {
      Object.keys(localSec).forEach((keyName) => {
        const secu = this.navigator.getSecuritySchema(keyName);
        if (!secu) {
          if (this.throwOnSecurityMissing)
            throw Error(`Security lookup form key ${keyName} is missing!`);
          return;
        }
        secuHandler(secu, localSec[keyName], keyName, localSec, context);
      });
    });
  }

  execute<
    P extends keyof InterfacePath & string,
    M extends keyof InterfacePath[P] &
      keyof Pick<
        PathObject,
        | "get"
        | "delete"
        | "options"
        | "patch"
        | "post"
        | "put"
        | "trace"
        | "head"
      >,
    Responses extends DescriptorResponses<
      InterfacePath[P][M]
    > = DescriptorResponses<InterfacePath[P][M]>,
    ExpectedResType extends keyof ResponseFinder<
      Responses,
      M
    > = "application/json" extends keyof ResponseFinder<Responses, M>
      ? "application/json"
      : keyof ResponseFinder<Responses, M>
  >(
    context: Context
  ): AxiosPromise<ResponseFinder<Responses, M>[ExpectedResType]> {
    const axiosContext = context.requestData;
    if (context.queryParameterChain.length > 0) {
      axiosContext.url += "?" + context.queryParameterChain.join("&");
    }
    if (context.headers) {
      const headers = axiosContext.headers ?? new AxiosHeaders();
      context.headers.forEach((header) => {
        headers[header[0]] = header[1];
      });
      axiosContext.headers = headers;
    }
    console.log(axiosContext);
    switch (context.method) {
      case "get":
        return axios.get(axiosContext.url, axiosContext);
      case "delete":
        return axios.delete(axiosContext.url, axiosContext);
      case "options":
        return axios.options(axiosContext.url, axiosContext);
      case "patch":
        return axios.patch(axiosContext.url, axiosContext.data, axiosContext);
      case "post":
        return axios.post(axiosContext.url, axiosContext.data, axiosContext);
      case "put":
        return axios.put(axiosContext.url, axiosContext.data, axiosContext);
      case "trace":
        throw Error("Thrace is not supported by axios");
      case "head":
        return axios.head(axiosContext.url, axiosContext);
    }
    throw Error(`The method ${context.method} is not conforming`);
  }

  async query<
    P extends keyof InterfacePath & keyof ZodPath & string,
    M extends keyof InterfacePath[P] &
      keyof ZodPath[P] &
      keyof Pick<
        PathObject,
        | "get"
        | "delete"
        | "options"
        | "patch"
        | "post"
        | "put"
        | "trace"
        | "head"
      >,
    Bodies extends DescriptorBodies<InterfacePath[P][M]>,
    BodyKey extends Bodies extends undefined
      ? undefined
      : keyof Bodies & string,
    Content extends BodyKey extends keyof Bodies ? Bodies[BodyKey] : undefined,
    Parameters extends DescriptorParameters<InterfacePath[P][M]>,
    ZodOptions extends {} & (BodyKey extends undefined
      ? {}
      : { requestBody?: boolean }) &
      (Parameters extends undefined
        ? {}
        : {
            [key in keyof DescriptorParameters<ZodPath[P][M]> &
              keyof Parameters]?: {
              [subKey in keyof DescriptorParameters<ZodPath[P][M]>[key] &
                keyof Parameters[key]]?: boolean;
            };
          }),
    Responses extends DescriptorResponses<
      InterfacePath[P][M]
    > = DescriptorResponses<InterfacePath[P][M]>,
    ExpectedResType extends keyof ResponseFinder<
      Responses,
      M
    > = "application/json" extends keyof ResponseFinder<Responses, M>
      ? "application/json"
      : keyof ResponseFinder<Responses, M>
  >(
    path: P,
    method: M,
    bodyKey: BodyKey,
    requestContent: Content,
    parameters: Parameters,
    options?: {
      expectedResultType?: keyof ResponseFinder<Responses, M> & string;
      validate?: ZodOptions;
    }
  ) {
    if (bodyKey && options?.validate && options.validate != null) {
      if (requestContent && "requestBody" in options.validate) {
        const bodyValidator = this.zodPath[path][method]["requestBody"];
        if (bodyValidator && bodyKey in bodyValidator) {
          bodyValidator[bodyKey].parse(requestContent);
        } else {
          if (!this.silentError) {
            throw Error("Zod requestBody not found!" + `${path}->${method}`);
          } else
            console.log("Zod requestBody not found!" + `${path}->${method}`);
        }
        if (parameters) {
          const parZod = this.zodPath[path][method]["parameters"];
          if (parZod)
            Object.keys(parameters).forEach((keyType) => {
              if (keyType in parZod) {
                const parTargetZod = parZod[keyType as keyof typeof parZod];
                if (parTargetZod) {
                  Object.keys(parameters[keyType]).map((pr) => {
                    const parameterZod = parTargetZod[pr];
                    parameterZod.parse(parameters[keyType][pr]);
                  });
                }
              } else if (!this.silentError) {
                throw Error(
                  "Zod paramters type not found!" +
                    `${path}->${method}->${keyType}`
                );
              } else
                console.log(
                  "Zod paramters type not found!" +
                    `${path}->${method}->${keyType}`
                );
            });
          else if (!this.silentError) {
            throw Error(
              "Zod paramters group not found!" + `${path}->${method}`
            );
          } else
            console.log(
              "Zod paramters group not found!" + `${path}->${method}`
            );
        }
      }
    }

    const starter =
      typeof this.axiosStarter == "function"
        ? this.axiosStarter()
        : this.axiosStarter;
    const context = this.contextMaker({
      lookup: this.navigator.getContext(path, method),
      requestData: { ...starter, url: path },
      queryParameterChain: [],
      headers: [],
      method,
    });
    if (bodyKey) {
      this.parseBody<P, M, Bodies, BodyKey, Content>(
        path,
        method,
        bodyKey,
        requestContent,
        context
      );
    }
    if (parameters) {
      this.parseParameters<P, M, Parameters>(path, method, parameters, context);
    }
    this.handleGlobalSecurity(context);
    this.handleLocalSecurity(context);
    return this.execute<P, M, Responses, ExpectedResType>(context);
  }
}
