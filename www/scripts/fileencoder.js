import { EventDispatcher } from './event.js';

class Header {
  /**
   * 
   * @param {string} name 
   * @param {Date} lastModified 
   * @param {string} mimeType 
   */
  constructor(name, lastModified, mimeType) {
    this.name = name;
    this.lastModified = lastModified;
    this.mimeType = mimeType;
  }
}

const DataByteSizes = {
  Int8: 1,
  Int16: 2,
  Int32: 4
};

/**
 * @typedef {{
 *  FileEncoded: (data: ArrayBuffer) => void,
 *  Error: (error: any) => void,
 *  QueueSizeChanged: (length: number) => void
 * }} PaluNivEncoderEvents
 */

 export class PaluNivEncoder {

  /**
   * @type {Array<File>}

   */
  #fileQueue = [];

  /**
   * @type {Promise<void>}

   */
  #worker = undefined;

  /**
   * @type {EventDispatcher<PaluNivEncoderEvents>}

   */
  #events = new EventDispatcher();

  constructor() {
    this.addEventListener = this.#events.addEventListener;
  }

  /**
   * 
   * @param {Array<File>} files 
   */
  enqueueFiles(files) {
    this.#fileQueue.push(...files);
    this.#events.fireEvent('QueueSizeChanged', this.#fileQueue.length);

    // Already working the queue?
    if (!this.#worker) {
      // Create the worker
      this.#worker = this.#processFiles()
        .finally(() => this.#worker = undefined);
    }
  }

  async #processFiles() {
    while (this.#fileQueue.length > 0) {
      try {
        const file = this.#fileQueue.shift();
        const lastModified = new Date(file.lastModified);
        const header = new Header(file.name, lastModified, file.type);
        const payload = this.#encodeFileWithHeader(header, await file.arrayBuffer());
        this.#events.fireEvent('FileEncoded', payload);
        this.#events.fireEvent('QueueSizeChanged', this.#fileQueue.length);
      } catch (error) {
        this.#events.fireEvent('Error', error);
      }
    }
  };

  /**
   * Buffer layout:
   * * Int32: Number of header bytes
   * * Uint8[]: Header characters
   * * Uint8[]: File bytes
   * @param {Header} header
   * @param {ArrayBuffer} fileBuffer 
   * @returns {ArrayBuffer} the entire message (header length, header, and file) as bytes
   */
  #encodeFileWithHeader(header, fileBuffer) {
    if (!header) {
      throw new Exception('no header given');
    }
    // JavaScript uses utf-16 for strings. The following converts to utf-8.
    const utf8Array = (new TextEncoder()).encode(JSON.stringify(header));

    // Calculate the number of bytes required and create the buffer
    const writeBuffer = new ArrayBuffer(DataByteSizes.Int32 + utf8Array.byteLength + fileBuffer.byteLength);

    // Create a uint8 view
    const byteView = new Uint8Array(writeBuffer);

    let offset = 0;
    // Write the size using little endian (most architectures
    // use little endian; AIX, Mac PowerPC, SPARC, and risc prior to risc-v are notable
    // exceptions be sure to specify the endianness in the backend anyway to be certain)
    (new DataView(writeBuffer, 0)).setInt32(offset, utf8Array.byteLength, true);
    offset += DataByteSizes.Int32;

    // Write the UTF8 bytes; Set copies a whole array into a region of another array
    byteView.set(utf8Array, offset);
    offset += utf8Array.byteLength;

    // Write the file bytes
    byteView.set(new Uint8Array(fileBuffer), offset);
    offset += fileBuffer.byteLength;

    return writeBuffer;
  };
}
