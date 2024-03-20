// simple *     false * 	{id} 	X-MyHeader: 5 	X-MyHeader: 3,4,5 	X-MyHeader: role,admin,firstName,Alex
// simple 	    true 	    {id*} 	X-MyHeader: 5 	X-MyHeader: 3,4,5 	X-MyHeader: role=admin,firstName=Alex
export function headerSimpleEncode(key: string, data: any, explode: boolean) {
  switch (typeof data) {
    case "string":
      return data;
    case "number":
      return `${data}`;
    case "bigint":
      return `${data}`;
    case "boolean":
      return `${data}`;
    case "undefined":
      throw Error("Path Parameter cannot be undefined!");
    case "object":
      if (Array.isArray(data)) {
        return data.map((d) => `${d}`).join(",");
      } else {
        if (explode) {
          return Object.keys(data)
            .map((dk) => `${dk}=${data[dk]}`)
            .join(",");
        } else {
          return Object.keys(data)
            .map((dk) => `${dk},${data[dk]}`)
            .join(",");
        }
      }
    case "function":
    case "symbol":
  }
  throw Error("Path Parameter cannot be resolved!" + `<${key}>`);
}
