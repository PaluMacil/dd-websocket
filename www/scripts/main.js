import { WS } from './websocket.js';
import { FileDropZone } from './filedrop.js';
import { PaluNivEncoder } from './fileencoder.js';

console.log('Loading');

const connection = new WS('ws://localhost:8080/hub');

/**
 * 
 * @param {HTMLElement} element
 */
const setupFileUploader = (element) => {
  const fileZone = new FileDropZone(element);
  const encoder = new PaluNivEncoder();
  const paragraphElement = element.querySelector('p');

  // File zone events
  fileZone.addEventListener('StatusChanged', (status) => paragraphElement.innerText = status);
  fileZone.addEventListener('FilesDropped', (files) => {
    console.log(`${files.length} file(s) dropped`);
    encoder.enqueueFiles(files);
  });
  fileZone.addEventListener('DragOver', (supported) => element.style.borderColor = (supported ? 'lime' : 'red'));
  fileZone.addEventListener('DragEnd', () => element.style.borderColor = 'blue');

  // Encoder events
  encoder.addEventListener('FileEncoded', (payload) => {
    console.log('Write Buffer', payload);
    connection.send(payload);
    console.log("message sent to server");
  });
  encoder.addEventListener('QueueSizeChanged', (len) => document.title = (len > 0) ? `Encoding ${len} files...` : 'Encoding Complete');
  encoder.addEventListener('Error', (error) => console.error(error));
};

setupFileUploader(document.getElementById('drop_zone'));

console.log('Loaded');
