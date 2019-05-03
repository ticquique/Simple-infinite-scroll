/* eslint-disable no-undef */
const jsonPromise = fetch('a.json');
let navHeight = 1920;
let divSize = 50;
let jsonData = [];
let oldInitial = 0;
let oldEnd = 0;
const visibleData = [];

const emitValue = (cmd, val) => {
  postMessage({ cmd, val });
};

const checkElement = (element, search) => {
  return element.name.includes(search);
};

const findElements = (search, position = 0) => {
  const initPos = parseInt(position / divSize, 10);
  for (let i = initPos; i < jsonData.length; i++) {
    if (checkElement(jsonData[i], search)) {
      emitValue('searchResult', i * divSize);
    }
  }
  for (let i = 0; i < initPos; i++) {
    if (checkElement(jsonData[i], search)) {
      emitValue('searchResult', i * divSize);
    }
  }
};

const calcData = (initial) => {
  let initPos = parseInt((initial - navHeight) / divSize, 10);
  initPos = initPos < 0 ? 0 : initPos;
  let endPos = parseInt((initial + 2 * navHeight) / divSize, 10);
  endPos = endPos > jsonData.length ? jsonData.length : endPos;
  const filteredArray = jsonData.slice(initPos, endPos);

  if (oldInitial > endPos || oldEnd < initPos) {
    for (let i = oldInitial - 1; i >= 0 && i < oldEnd; i++) {
      emitValue('removeData', i);
      visibleData[i] = null;
    }
  }

  for (let i = initPos - 1; i >= 0 && visibleData[i] !== null; i--) {
    emitValue('removeData', i);
    visibleData[i] = null;
  }

  for (let i = endPos; i < visibleData.length && visibleData[i] !== null; i++) {
    emitValue('removeData', i);
    visibleData[i] = null;
  }

  filteredArray.forEach((val, i) => {
    if (visibleData[initPos + i] === undefined || visibleData[initPos + i] === null) {
      visibleData[initPos + i] = val;
      emitValue('addData', { data: val, index: initPos + i });
    }
  });

  oldInitial = initPos;
  oldEnd = endPos;
};

onmessage = (e) => {
  const data = e.data;
  switch (data.cmd) {
    case 'initialized':
      navHeight = data.val.navHeight;
      divSize = data.val.divSize;
      calcData(0);
      break;
    case 'onscroll':
      calcData(data.val);
      break;
    case 'onsearch':
      findElements(data.val.search, data.val.position);
      break;
    default:
      break;
  }
};

initializeWorker = () => {
  jsonPromise.then(val => val.json()).then(val => {
    jsonData = val;
    emitValue('initial', jsonData.length);
  });
};

initializeWorker();
