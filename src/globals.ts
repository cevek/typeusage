export type Usage<T, N> = { [K in keyof T]: T[K] extends Array<infer El> ? Usage<El, N & K>[] : Usage<T[K], N & K> };
export type Auto = { auto: Auto };