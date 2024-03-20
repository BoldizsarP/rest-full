// form 	false 	/users{?id} 	/users?id=5 	/users?id=3,4,5 	/users?id=role,admin,firstName,Alex
// form * 	true * 	/users{?id*} 	/users?id=5 	/users?id=3&id=4&id=5 	/users?role=admin&firstName=Alex
export function queryFormSerializer(key: string, data: any, explode: boolean) {
  switch (typeof data) {
    case "string":
      return `${key}=` + encodeURIComponent(data);
    case "number":
      return `${key}=${encodeURIComponent(data)}`;
    case "boolean":
      return `${key}=${encodeURIComponent(data)}`;
    case "undefined":
      throw Error("Query Parameter cannot be undefined!");
    case "object":
      if (Array.isArray(data)) {
        return data
          .map((d) =>
            explode
              ? `${key}=${encodeURIComponent(d)}`
              : `${encodeURIComponent(d)}`
          )
          .join(explode ? "&" : ",");
      } else {
        if (explode) {
          return Object.keys(data)
            .map((dk) => `${dk}=${encodeURIComponent(data[dk])}`)
            .join("&");
        } else {
          return (
            `${key}=` +
            Object.keys(data)
              .map((dk) => `${dk},${encodeURIComponent(data[dk])}`)
              .join(",")
          );
        }
      }
    case "function":
    case "symbol":
  }
  throw Error("Query Parameter cannot be resolved!" + `<${key}>`);
}

// spaceDelimited 	false 	n/a 	n/a 	/users?id=3%204%205 	n/a
// spaceDelimited 	true 	/users{?id*} 	n/a 	/users?id=3&id=4&id=5 	n/a
export function querySpaceDelimitedSerializer(
  key: string,
  data: any,
  explode: boolean
) {
  switch (typeof data) {
    case "string":
      throw Error(
        "Using Space Delimition, parameter must be of array! 'string' was given,\n if you still want to use spaceDelimited,\n consider customizing the querySpaceDelimitedSerializer function" +
          `<${key}>`
      );
    case "number":
      throw Error(
        "Using Space Delimition, parameter must be of array! 'number' was given,\n if you still want to use spaceDelimited,\n consider customizing the querySpaceDelimitedSerializer function" +
          `<${key}>`
      );
    case "boolean":
      throw Error(
        "Using Space Delimition, parameter must be of array! 'boolean' was given,\n if you still want to use spaceDelimited,\n consider customizing the querySpaceDelimitedSerializer function" +
          `<${key}>`
      );
    case "undefined":
      throw Error("Query Parameter cannot be undefined!");
    case "object":
      if (Array.isArray(data)) {
        return data
          .map((d) =>
            explode
              ? `${key}=${encodeURIComponent(d)}`
              : `${encodeURIComponent(d)}`
          )
          .join(explode ? "&" : "%20");
      } else {
        throw Error(
          "Using Space Delimition, parameter must be of array! 'object' was given,\n if you still want to use spaceDelimited,\n consider customizing the querySpaceDelimitedSerializer function" +
            `<${key}>`
        );
      }
    case "function":
    case "symbol":
  }
  throw Error("Query Parameter cannot be resolved!" + `<${key}>`);
}
// pipeDelimited 	false 	n/a 	n/a 	/users?id=3|4|5 	n/a
// pipeDelimited 	true 	/users{?id*} 	n/a 	/users?id=3&id=4&id=5 	n/a
export function queryPipeDelimitedSerializer(
  key: string,
  data: any,
  explode: boolean
) {
  switch (typeof data) {
    case "string":
      throw Error(
        "Using Pipe Delimition, parameter must be of array! 'string' was given,\n if you still want to use pipeDelimited,\n consider customizing the queryPipeDelimitedSerializer function" +
          `<${key}>`
      );
    case "number":
      throw Error(
        "Using Pipe Delimition, parameter must be of array! 'number' was given,\n if you still want to use pipeDelimited,\n consider customizing the queryPipeDelimitedSerializer function" +
          `<${key}>`
      );
    case "boolean":
      throw Error(
        "Using Pipe Delimition, parameter must be of array! 'boolean' was given,\n if you still want to use pipeDelimited,\n consider customizing the queryPipeDelimitedSerializer function" +
          `<${key}>`
      );
    case "undefined":
      throw Error("Query Parameter cannot be undefined!");
    case "object":
      if (Array.isArray(data)) {
        return data
          .map((d) =>
            explode
              ? `${key}=${encodeURIComponent(d)}`
              : `${encodeURIComponent(d)}`
          )
          .join(explode ? "&" : "|");
      } else {
        throw Error(
          "Using Pipe Delimition, parameter must be of array! 'object' was given,\n if you still want to use pipeDelimited,\n consider customizing the queryPipeDelimitedSerializer function" +
            `<${key}>`
        );
      }
    case "function":
    case "symbol":
  }
  throw Error("Query Parameter cannot be resolved!" + `<${key}>`);
}
// deepObject 	true 	n/a 	n/a 	n/a 	/users?id[role]=admin&id[firstName]=Alex
export function queryDeepObjectSerializer(
  key: string,
  data: any,
  explode: boolean
) {
  switch (typeof data) {
    case "string":
      throw Error(
        "Using Deep Object, parameter must be of object! 'string' was given,\n if you still want to use deepObject,\n consider customizing the queryDeepObjectSerializer function" +
          `<${key}>`
      );
    case "number":
      throw Error(
        "Using Deep Object, parameter must be of object! 'number' was given,\n if you still want to use deepObject,\n consider customizing the queryDeepObjectSerializer function" +
          `<${key}>`
      );
    case "boolean":
      throw Error(
        "Using Deep Object, parameter must be of object! 'boolean' was given,\n if you still want to use deepObject,\n consider customizing the queryDeepObjectSerializer function" +
          `<${key}>`
      );
    case "undefined":
      throw Error("Query Parameter cannot be undefined!");
    case "object":
      if (Array.isArray(data)) {
        throw Error(
          "Using Deep Object, parameter must be of object! 'array' was given,\n if you still want to use deepObject,\n consider customizing the queryDeepObjectSerializer function" +
            `<${key}>`
        );
      } else {
        if (explode) {
          return Object.keys(data)
            .map((dk) => `${key}[${dk}]=${encodeURIComponent(data[dk])}`)
            .join("&");
        } else {
          throw Error(
            "Using Deep Object, explode must be set to true!" + `<${key}>`
          );
        }
      }
    case "function":
    case "symbol":
  }
  throw Error("Query Parameter cannot be resolved!" + `<${key}>`);
}
