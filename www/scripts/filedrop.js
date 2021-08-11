import { EventDispatcher } from './event.js';

/**
 * @typedef {{
 *  StatusChanged: (status: string) => void
 *  FilesDropped: (files: Array<file>) => void
 *  DragOver: (hasFiles: boolean) => void
 *  DragEnd: ()=>void
 * }} FileDropZoneEvents
 */

 export class FileDropZone {

  #statusMessages = {
    Idle: 'File Drop Zone',
    Drop: 'Let go to upload file(s)',
    HasNoFiles: 'Unsupported'
  };

  /**
   * @type {EventDispatcher<FileDropZoneEvents>}

   */
  #events = new EventDispatcher();

  /**
   * 
   * @param {HTMLElement} element 
   */
  constructor(element) {
    this.addEventListener = this.#events.addEventListener;
    this.#bindToElement(element);
    this.addEventListener('DragEnd', () => this.#events.fireEvent('StatusChanged', this.#statusMessages.Idle));
  }

  /**
   * 
   * @param {DragEvent} ev 
   */
  #onDragOver(ev) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
    // Determine if the drag event has any files
    const hasFiles = !!ev.dataTransfer?.types?.includes('Files');

    this.#events.fireEvent('DragOver', hasFiles);

    if (hasFiles) {
      this.#events.fireEvent('StatusChanged', this.#statusMessages.Drop);
    } else {
      this.#events.fireEvent('StatusChanged', this.#statusMessages.HasNoFiles);
      // Provide visual feedback this is not allowed
      ev.dataTransfer.dropEffect = 'none';
    }
  };

  /**
   * 
   * @param {DragEvent} ev 
   */
  #onDragLeave(ev) {
    this.#events.fireEvent('DragEnd');
  };

  /**
   * @param {DragEvent} ev
   */
  #onDrop(ev) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
    const files = Array.from(ev.dataTransfer.files);
    this.#events.fireEvent('FilesDropped', files);
    this.#events.fireEvent('DragEnd');
  };

  /**
   * 
   * @param {HTMLElement} element 
   */
  #bindToElement(element) {
    element.addEventListener("drop", (ev) => this.#onDrop(ev));
    element.addEventListener("dragover", (ev) => this.#onDragOver(ev));
    element.addEventListener("dragleave", (ev) => this.#onDragLeave(ev));
  }


};

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