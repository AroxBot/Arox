export function flatten(obj: Record<string, any>, prefix = ""): Record<string, any> {
  return Object.keys(obj).reduce(
    (acc: Record<string, any>, k) => {
      const pre = prefix.length ? prefix + "." : "";
      if (typeof obj[k] === "object") Object.assign(acc, flatten(obj[k], pre + k));
      else acc[pre + k] = obj[k];
      return acc;
    },
    {} as Record<string, any>
  );
}

export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export const arrayToMap = <T>(arr: T[], keyFn: (i: T) => string) => new Map(arr.map((i) => [keyFn(i), i]));
export function checkInHere(userID: string, array: string[]) {
  return array.includes(userID);
}

/**
 * Bir parçanın toplama göre yüzdesini hesaplar.
 *
 * @param part - Hesaplanacak parça değeri
 * @param total - Toplam değer
 * @param options - Hesaplama seçenekleri
 * @returns Hesaplanan yüzde değeri
 */
export function calculatePercentage(
  part: number,
  total: number,
  options: {
    decimals?: number;
    clamp?: boolean;
  } = {}
): number {
  const { decimals = 2, clamp = true } = options;
  if (total === 0) {
    return 0;
  }
  let percentage = (part / total) * 100;
  percentage = Number(percentage.toFixed(decimals));
  return clamp ? Math.max(0, Math.min(100, percentage)) : percentage;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function getRandomElements<T>(arr: T[], count: number): T[] {
  if (count > arr.length) {
    throw new Error("İstenilen eleman sayısı, dizinin uzunluğundan fazla olamaz.");
  }

  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

export function capitalizeWordsRegex(sentence: string): string {
  return sentence.replace(/\b\p{L}/gu, (char) => char.toLocaleUpperCase("tr-TR"));
}
