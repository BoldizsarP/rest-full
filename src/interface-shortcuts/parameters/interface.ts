export type DescriptorParameters<T> = "parameters" extends keyof T
  ? T["parameters"] & { [key: string]: any }
  : undefined;
