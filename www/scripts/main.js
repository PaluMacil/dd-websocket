import { WS } from './websocket.js';

const connection = new WS('ws://localhost:8080/hub');

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

console.log('Loading');

const DataByteSizes = {
    Int8: 1,
    Int16: 2,
    Int32: 4
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
const encodeFileWithHeader = (header, fileBuffer) => {
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

/**
 * 
 * @param {Array<File>} files 
 */
const processFiles = async (files) => {
    for (let file of files) {
      const lastModified = new Date(file.lastModified);
      const header = new Header(file.name, lastModified, file.type);
      const payload = encodeFileWithHeader(header, await file.arrayBuffer());
      console.log('Write Buffer', payload);
      connection.send(payload);
      console.log("message sent to server");
    }
};

const dropHandler = (ev) => {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
  const files = Array.from(ev.dataTransfer.files);
  console.log(`${files.length} file(s) dropped`);
  processFiles(files);
}

const dragOverHandler = (ev) => {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
    dropZone.innerHTML = "<p>let go to upload</p>";
}

// Another approach besides using the File Drag and drop API would be to use
// an even listener on the change of a file input. Modern browsers allow you to 
// drag files onto that button already, and you can use CSS to expand the area 
// this takes up. However, you don't have the same flexibility with styling.
// This would be accomplished with document.getElementById('file-input').addEventListener('change', 
//   (loadEvent) => processFiles(Array.from(loadEvent.target.files)), { capture: false });
//
// Capture being set to false means we see the event as it bubbles up
// we only want to handle the event after the input has handled the event.
// There is an intended edge case on some browsers when you hit cancel where
// when the cancel takes place is after the bubble down. If they hit choose 
// file and hit cancel, it does not bubble back up.

const dropZone = document.getElementById('drop_zone');
dropZone.addEventListener("drop", dropHandler);
dropZone.addEventListener("dragover", dragOverHandler);
const leave = (ev) => dropZone.innerHTML = "<p>File Drop Zone</p>";
dropZone.addEventListener("dragleave", leave, "dragleave");

console.log('Loaded');
