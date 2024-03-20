export type DescriptorParameters<T> = "parameters" extends keyof T
  ? T["parameters"]
  : undefined;
