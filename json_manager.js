/* eslint-disable no-undef */
const jsonPromise = fetch("e.json");
let navHeight = 1920;
let divSize = 150;
let jsonData = [];
let oldInitial = 0;
let oldEnd = 0;
const visibleData = [];

/**
 * Emits a value to the worker
 * @param {string} cmd Type of message to send to the worker
 * @param {any} val Value passed as message
 */
const emitValue = (cmd, val) => {
  postMessage({ cmd, val });
};

/**
 * Check if array contains element
 * @param {any} element Element into which search for subarray
 * @param {string} search Element searched
 */
const checkElement = (element, search) => {
  const name = `${element.name.first} ${element.name.last}`;
  return name.includes(search);
};

/**
 * Emits a result for each match from a position given first
 * @param {string} search String looked for
 * @param {int} position Position to start the search
 */
const findElements = (search, position = 0) => {
  /** Calculate current position*/
  const initPos = parseInt(position / divSize, 10);

  /** Search first in next positions*/
  for (let i = initPos; i < jsonData.length; i++) {
    if (checkElement(jsonData[i], search)) {
      emitValue("searchResult", i);
    }
  }
  /** Search in previous positions*/
  for (let i = 0; i < initPos; i++) {
    if (checkElement(jsonData[i], search)) {
      emitValue("searchResult", i);
    }
  }
};

/**
 * Create a window between an initial position and end position based on the browser size
 * @param {int} initial Position to start looking for data
 */
const calcData = initial => {
  /** Get initial position or 0 if initial is lower than window height */
  let initPos = parseInt((initial - navHeight) / divSize, 10);
  initPos = initPos < 0 ? 0 : initPos;

  /** Get end position or json length */
  let endPos = parseInt((initial + 2 * navHeight) / divSize, 10);
  endPos = endPos > jsonData.length ? jsonData.length : endPos;

  /** Filter the json array */
  const filteredArray = jsonData.slice(initPos, endPos);

  /** Ensure delete every element  in previous position if jump*/
  if (oldInitial > endPos || oldEnd < initPos) {
    for (let i = oldInitial; i < oldEnd; i++) {
      emitValue("removeData", i);
      visibleData[i] = null;
    }
  }

  /** Delete every element from previous positions*/
  for (let i = initPos - 1; i >= 0 && visibleData[i] !== null; i--) {
    emitValue("removeData", i);
    visibleData[i] = null;
  }

  /** Delete every element from next positions*/
  for (let i = endPos; i < visibleData.length && visibleData[i] !== null; i++) {
    emitValue("removeData", i);
    visibleData[i] = null;
  }

  /** Add additional data*/
  filteredArray.forEach((val, i) => {
    if (
      visibleData[initPos + i] === undefined ||
      visibleData[initPos + i] === null
    ) {
      visibleData[initPos + i] = val;
      emitValue("addData", { data: val, index: initPos + i });
    }
  });

  oldInitial = initPos;
  oldEnd = endPos;
};

/**
 * Manage messages received from the main thread
 */
onmessage = e => {
  const data = e.data;
  switch (data.cmd) {
    case "initialized":
      // Initialize browser height and div size and emit firsts values
      // (navHeight = browser height, divSize = size of each element)
      navHeight = data.val.navHeight;
      divSize = data.val.divSize;
      calcData(0);
      break;
    case "onscroll":
      // Calculate window elements based on position (val = scroll position)
      calcData(data.val);
      break;
    case "onsearch":
      // Search elements (search = substring to look for, position = position to start the search)
      findElements(data.val.search, data.val.position);
      break;
    default:
      break;
  }
};

initializeWorker = () => {
  jsonPromise
    .then(val => val.json())
    .then(val => {
      jsonData = val;
      emitValue("initial", jsonData.length);
    });
};

initializeWorker();
