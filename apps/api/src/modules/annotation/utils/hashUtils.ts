export class HashUtil {
  sha256(input: string): string {
    // 簡單的哈希實現，在實際應用中應該使用crypto模組
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 轉換為32位整數
    }
    return Math.abs(hash).toString(16);
  }

  md5(input: string): string {
    // 簡化的MD5實現，實際應用中使用crypto
    return this.sha256(input).substring(0, 8);
  }

  generateFingerprint(text: string): string {
    // 生成文本指紋
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
    return this.sha256(normalized);
  }
} 