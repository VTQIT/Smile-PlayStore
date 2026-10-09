import fs from 'fs';

export interface ApkValidationResult {
  valid: boolean;
  error?: string;
  entryNames: string[];
  hasManifest: boolean;
  hasDex: boolean;
  hasSignature: boolean;
  signatureScheme?: 'v1' | 'v2/v3' | 'v1+v2/v3' | 'unsigned';
  fileSize: number;
}

/**
 * Validates APK file structure, ZIP header integrity, presence of core Android files,
 * and signature manifests (v1 META-INF/ and v2/v3 signing blocks).
 */
export function validateAndroidApk(filePathOrBuffer: string | Buffer): ApkValidationResult {
  let buffer: Buffer;

  if (typeof filePathOrBuffer === 'string') {
    if (!fs.existsSync(filePathOrBuffer)) {
      return {
        valid: false,
        error: 'File does not exist',
        entryNames: [],
        hasManifest: false,
        hasDex: false,
        hasSignature: false,
        fileSize: 0
      };
    }
    buffer = fs.readFileSync(filePathOrBuffer);
  } else {
    buffer = filePathOrBuffer;
  }

  const fileSize = buffer.length;
  if (fileSize < 22) {
    return {
      valid: false,
      error: 'File too small to be a valid ZIP/APK archive',
      entryNames: [],
      hasManifest: false,
      hasDex: false,
      hasSignature: false,
      fileSize
    };
  }

  // Verify ZIP End of Central Directory (EOCD) signature: 0x06054b50
  // Search backward from end of file for up to 65536 + 22 bytes
  let eocdOffset = -1;
  const maxSearch = Math.min(fileSize, 65558);
  for (let i = fileSize - 22; i >= fileSize - maxSearch; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    return {
      valid: false,
      error: 'Invalid archive: End of Central Directory record not found',
      entryNames: [],
      hasManifest: false,
      hasDex: false,
      hasSignature: false,
      fileSize
    };
  }

  const cdTotalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdSize = buffer.readUInt32LE(eocdOffset + 12);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  if (cdOffset + cdSize > eocdOffset || cdOffset > fileSize) {
    return {
      valid: false,
      error: 'Corrupted ZIP archive: Central directory boundaries invalid',
      entryNames: [],
      hasManifest: false,
      hasDex: false,
      hasSignature: false,
      fileSize
    };
  }

  // Parse central directory entries
  const entryNames: string[] = [];
  let curr = cdOffset;
  for (let i = 0; i < cdTotalEntries && curr + 46 <= eocdOffset; i++) {
    const sig = buffer.readUInt32LE(curr);
    if (sig !== 0x02014b50) break; // End or corrupted

    const filenameLen = buffer.readUInt16LE(curr + 28);
    const extraLen = buffer.readUInt16LE(curr + 30);
    const commentLen = buffer.readUInt16LE(curr + 32);

    const filenameStart = curr + 46;
    if (filenameStart + filenameLen <= buffer.length) {
      const filename = buffer.toString('utf-8', filenameStart, filenameStart + filenameLen);
      entryNames.push(filename);
    }

    curr += 46 + filenameLen + extraLen + commentLen;
  }

  const hasManifest = entryNames.some(e => e.toLowerCase() === 'androidmanifest.xml');
  const hasDex = entryNames.some(e => e.toLowerCase().endsWith('.dex'));
  
  // v1 signature check: META-INF/*.SF or META-INF/*.RSA or META-INF/*.DSA or META-INF/*.EC
  const hasV1Sig = entryNames.some(e => 
    e.startsWith('META-INF/') && 
    (e.endsWith('.SF') || e.endsWith('.RSA') || e.endsWith('.DSA') || e.endsWith('.EC'))
  );

  // Check for Android APK Signature Scheme v2/v3 Block
  // The APK Signing Block sits immediately before the Central Directory
  let hasV2V3Sig = false;
  if (cdOffset >= 24) {
    // 16-byte magic: "APK Sig Block 42" -> [0x41, 0x50, 0x4b, 0x20, 0x53, 0x69, 0x67, 0x20, 0x42, 0x6c, 0x6f, 0x63, 0x6b, 0x20, 0x34, 0x32]
    const magic = buffer.subarray(cdOffset - 16, cdOffset).toString('latin1');
    if (magic === 'APK Sig Block 42') {
      hasV2V3Sig = true;
    }
  }

  const hasSignature = hasV1Sig || hasV2V3Sig;
  let signatureScheme: ApkValidationResult['signatureScheme'] = 'unsigned';
  if (hasV1Sig && hasV2V3Sig) {
    signatureScheme = 'v1+v2/v3';
  } else if (hasV2V3Sig) {
    signatureScheme = 'v2/v3';
  } else if (hasV1Sig) {
    signatureScheme = 'v1';
  }

  if (!hasManifest) {
    return {
      valid: false,
      error: 'Missing AndroidManifest.xml: Not a valid Android package',
      entryNames,
      hasManifest,
      hasDex,
      hasSignature,
      signatureScheme,
      fileSize
    };
  }

  if (!hasDex) {
    return {
      valid: false,
      error: 'Missing classes.dex: Application contains no executable bytecode',
      entryNames,
      hasManifest,
      hasDex,
      hasSignature,
      signatureScheme,
      fileSize
    };
  }

  if (!hasSignature) {
    return {
      valid: false,
      error: 'Unsigned APK: Application lacks valid Android signature certificate (v1 META-INF or v2/v3 signing block)',
      entryNames,
      hasManifest,
      hasDex,
      hasSignature: false,
      signatureScheme: 'unsigned',
      fileSize
    };
  }

  return {
    valid: true,
    entryNames,
    hasManifest,
    hasDex,
    hasSignature: true,
    signatureScheme,
    fileSize
  };
}
