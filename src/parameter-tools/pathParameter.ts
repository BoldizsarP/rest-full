// simple * false * /users/{id} 	/users/5 	    /users/3,4,5 	          /users/role,admin,firstName,Alex
// simple 	true 	  /users/{id*} 	/users/5 	    /users/3,4,5 	          /users/role=admin,firstName=Alex
export function pathSimpleEncode(key: string, data: any, explode: boolean) {
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

// label 	  false 	/users/{.id} 	/users/.5 	  /users/.3,4,5 	        /users/.role,admin,firstName,Alex
// label 	  true 	  /users/{.id*} /users/.5 	  /users/.3.4.5 	        /users/.role=admin.firstName=Alex
export function pathLabelEncode(key: string, data: any, explode: boolean) {
  switch (typeof data) {
    case "string":
      return "." + data;
    case "number":
      return `.${data}`;
    case "bigint":
      return `.${data}`;
    case "boolean":
      return `.${data}`;
    case "undefined":
      throw Error("Path Parameter cannot be undefined!");
    case "object":
      if (Array.isArray(data)) {
        return "." + data.map((d) => `${d}`).join(explode ? "." : ",");
      } else {
        if (explode) {
          return (
            "." +
            Object.keys(data)
              .map((dk) => `${dk}=${data[dk]}`)
              .join(".")
          );
        } else {
          return (
            "." +
            Object.keys(data)
              .map((dk) => `${dk},${data[dk]}`)
              .join(",")
          );
        }
      }
    case "function":
    case "symbol":
  }
  throw Error("Path Parameter cannot be resolved!" + `<${key}>`);
}

// matrix 	false 	/users/{;id} 	/users/;id=5 	/users/;id=3,4,5 	      /users/;id=role,admin,firstName,Alex
// matrix 	true 	  /users/{;id*} /users/;id=5 	/users/;id=3;id=4;id=5 	/users/;role=admin;firstName=Alex
export function pathMatrixEncode(key: string, data: any, explode: boolean) {
  switch (typeof data) {
    case "string":
      return ";" + data;
    case "number":
      return `;${data}`;
    case "bigint":
      return `;${data}`;
    case "boolean":
      return `;${data}`;
    case "undefined":
      throw Error("Path Parameter cannot be undefined!");
    case "object":
      if (Array.isArray(data)) {
        return (
          ";" +
          data
            .map((d) => (explode ? `${key}=${d}` : `${d}`))
            .join(explode ? ";" : ",")
        );
      } else {
        if (explode) {
          return (
            ";" +
            Object.keys(data)
              .map((dk) => `${dk}=${data[dk]}`)
              .join(";")
          );
        } else {
          return (
            `${key}=` +
            Object.keys(data)
              .map((dk) => `${dk},${data[dk]}`)
              .join(",")
          );
        }
      }
    case "function":
    case "symbol":
  }
  throw Error("Path Parameter cannot be resolved!" + `<${key}>`);
}
