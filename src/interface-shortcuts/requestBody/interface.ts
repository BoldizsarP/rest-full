export type DescriptorBodies<T> = "requestBody" extends keyof T
  ? T["requestBody"]
  : undefined;
